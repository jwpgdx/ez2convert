"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONVERSION_LIMITS } from "@/lib/converters/constants";
import { convertImageToGif } from "@/lib/converters/image-to-gif";
import { convertAnimatedToGif } from "@/lib/converters/animated-to-gif";
import { convertVideoToGif } from "@/lib/converters/video-to-gif";
import { createFileItem } from "@/lib/converters/file-item";
import { detectFileType } from "@/lib/converters/detect-file-type";
import { getErrorMessage } from "@/lib/converters/error-messages";
import { ERROR_CODES } from "@/lib/constants/error-codes";
import {
  ENGINE_KINDS,
  resolveEngineKindFromQueueItem,
} from "@/lib/config/engine-dispatch";

function cleanupOutput(item) {
  if (item?.output?.url) {
    URL.revokeObjectURL(item.output.url);
  }
}

function clearOutputState(item) {
  cleanupOutput(item);
  return {
    ...item,
    output: {
      blob: null,
      url: null,
      name: null,
      size: null,
      width: null,
      height: null,
    },
  };
}

function splitName(fileName) {
  const index = fileName.lastIndexOf(".");
  if (index <= 0) {
    return { base: fileName, ext: "" };
  }
  return {
    base: fileName.slice(0, index),
    ext: fileName.slice(index),
  };
}

function getUniqueOutputName(name, items, currentId) {
  const taken = new Set(
    items
      .filter((item) => item.id !== currentId && item.output?.name)
      .map((item) => item.output.name)
  );

  if (!taken.has(name)) {
    return name;
  }

  const { base, ext } = splitName(name);
  let index = 1;
  while (taken.has(`${base} (${index})${ext}`)) {
    index += 1;
  }
  return `${base} (${index})${ext}`;
}

export function useGifConversionQueue({ settings, onNotify }) {
  const [items, setItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const itemsRef = useRef(items);
  const processingControllerRef = useRef(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const notify = useCallback(
    (code) => {
      onNotify?.({ code, message: getErrorMessage(code) });
    },
    [onNotify]
  );

  const addFiles = useCallback(
    async (files) => {
      if (!files?.length) {
        return;
      }

      let remainingSlots =
        CONVERSION_LIMITS.maxBatchFiles - itemsRef.current.length;
      if (remainingSlots <= 0) {
        notify(ERROR_CODES.EXCEEDS_BATCH_FILES_LIMIT);
        return;
      }

      const acceptedItems = [];
      let batchOverflowNotified = false;

      for (const file of files) {
        if (remainingSlots <= 0) {
          if (!batchOverflowNotified) {
            notify(ERROR_CODES.EXCEEDS_BATCH_FILES_LIMIT);
            batchOverflowNotified = true;
          }
          break;
        }

        const typeResult = await detectFileType(file);
        if (!typeResult.ok) {
          notify(typeResult.errorCode);
          continue;
        }

        if (file.size > CONVERSION_LIMITS.maxFileSizeBytes) {
          notify(ERROR_CODES.EXCEEDS_FILE_SIZE_LIMIT);
          continue;
        }

        acceptedItems.push(
          createFileItem(file, {
            detectedType: typeResult.type,
            isAnimated: Boolean(typeResult.animated),
            isVideo: Boolean(typeResult.video),
          })
        );
        remainingSlots -= 1;
      }

      if (acceptedItems.length > 0) {
        setItems((previous) => [...previous, ...acceptedItems]);
      }
    },
    [notify]
  );

  const start = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setIsCanceling(false);

    try {
      while (true) {
        const nextItem = itemsRef.current.find((item) => item.status === "pending");
        if (!nextItem) {
          break;
        }

        const controller = new AbortController();
        processingControllerRef.current = controller;

        setItems((previous) =>
          previous.map((item) =>
            item.id === nextItem.id
              ? { ...item, status: "processing", error: null }
              : item
          )
        );

        const engineKind = resolveEngineKindFromQueueItem(nextItem);
        const convert =
          engineKind === ENGINE_KINDS.VIDEO
            ? convertVideoToGif
            : engineKind === ENGINE_KINDS.ANIMATED_IMAGE
              ? convertAnimatedToGif
              : convertImageToGif;

        const result = await convert(nextItem.file, settings, {
          signal: controller.signal,
          detectedType: nextItem.input.detectedType,
        });

        processingControllerRef.current = null;

        if (result.ok) {
          const outputName = getUniqueOutputName(
            result.output.name,
            itemsRef.current,
            nextItem.id
          );
          setItems((previous) =>
            previous.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: "success",
                    error: null,
                    input: {
                      ...item.input,
                      width: result.output.width,
                      height: result.output.height,
                    },
                    output: {
                      ...result.output,
                      name: outputName,
                    },
                  }
                : item
            )
          );
          continue;
        }

        if (result.errorCode === ERROR_CODES.USER_CANCELED) {
          setItems((previous) =>
            previous.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: "canceled",
                    error: {
                      code: ERROR_CODES.USER_CANCELED,
                      message: getErrorMessage(ERROR_CODES.USER_CANCELED),
                    },
                  }
                : item
            )
          );
          continue;
        }

        notify(result.errorCode);
        setItems((previous) =>
          previous.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: "error",
                  error: {
                    code: result.errorCode,
                    message: getErrorMessage(result.errorCode),
                  },
                }
              : item
          )
        );
      }
    } finally {
      processingControllerRef.current = null;
      setIsRunning(false);
      setIsCanceling(false);
    }
  }, [isRunning, notify, settings]);

  const cancelAll = useCallback(() => {
    setIsCanceling(true);
    setItems((previous) =>
      previous.map((item) =>
        item.status === "pending" ? { ...item, status: "canceled" } : item
      )
    );
    processingControllerRef.current?.abort();
  }, []);

  const retry = useCallback((id) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id || item.status !== "error") {
          return item;
        }
        return {
          ...clearOutputState(item),
          status: "pending",
          error: null,
        };
      })
    );
  }, []);

  const remove = useCallback((id) => {
    const current = itemsRef.current.find((item) => item.id === id);
    cleanupOutput(current);
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const reset = useCallback(() => {
    itemsRef.current.forEach((item) => {
      cleanupOutput(item);
    });
    setItems([]);
    setIsCanceling(false);
  }, []);

  useEffect(() => {
    return () => {
      processingControllerRef.current?.abort();
      itemsRef.current.forEach((item) => cleanupOutput(item));
    };
  }, []);

  const stats = useMemo(() => {
    const done = items.filter((item) =>
      ["success", "error", "canceled"].includes(item.status)
    ).length;

    return {
      total: items.length,
      done,
      success: items.filter((item) => item.status === "success").length,
      processing: items.filter((item) => item.status === "processing").length,
      pending: items.filter((item) => item.status === "pending").length,
    };
  }, [items]);

  const capabilities = useMemo(() => {
    let hasAnimatedInput = false;
    let hasVideoInput = false;

    for (const item of items) {
      const engineKind = resolveEngineKindFromQueueItem(item);
      if (engineKind === ENGINE_KINDS.ANIMATED_IMAGE) {
        hasAnimatedInput = true;
      }
      if (engineKind === ENGINE_KINDS.VIDEO) {
        hasVideoInput = true;
      }

      if (hasAnimatedInput && hasVideoInput) {
        break;
      }
    }

    return {
      hasAnimatedInput,
      hasVideoInput,
    };
  }, [items]);

  return {
    items,
    isRunning,
    isCanceling,
    addFiles,
    start,
    cancelAll,
    retry,
    remove,
    reset,
    stats,
    capabilities,
  };
}

