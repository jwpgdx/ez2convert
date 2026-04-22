import { detectFileType } from "./detect-file-type";
import {
  applyOrientationTransform,
  getOrientedDimensions,
  readJpegOrientation,
} from "./image-orientation";
import { MIME_TYPES } from "../config/file-types";
import { ERROR_CODES } from "../constants/error-codes";
import {
  createEngineError,
  mapUnknownErrorCode,
  throwIfAborted,
} from "../engines/common/errors";
import {
  normalizeConversionOptions,
  resolveResizeDimensions,
} from "../engines/common/resize";
import {
  getDimensionsLimitErrorCode,
  getFileSizeLimitErrorCode,
} from "../engines/common/validation";
import { resizeCanvasWithPica } from "../engines/image-png/pica-resize";
import { encodeGifImageData } from "../engines/image-gif/gif-engine";

function getBaseName(fileName) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

async function decodeWithImageBitmap(file) {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => {
        bitmap.close();
      },
    };
  } catch {
    return null;
  }
}

async function decodeWithImageElement(file, signal) {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    const onAbort = () => {
      image.src = "";
      URL.revokeObjectURL(url);
      reject(createEngineError(ERROR_CODES.USER_CANCELED));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    image.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => {
          URL.revokeObjectURL(url);
        },
      });
    };

    image.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
      reject(createEngineError(ERROR_CODES.DECODE_FAILED));
    };

    image.src = url;
  });
}

async function decodeImage(file, signal) {
  throwIfAborted(signal);

  const bitmapResult = await decodeWithImageBitmap(file);
  if (bitmapResult) {
    return bitmapResult;
  }

  return decodeWithImageElement(file, signal);
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw createEngineError(ERROR_CODES.ENCODE_FAILED);
  }
  return { canvas, context };
}

function canvasToImageData(canvas) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw createEngineError(ERROR_CODES.GIF_ENCODE_FAILED);
  }

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function mapGifErrorCode(error, signal) {
  if (signal?.aborted) {
    return ERROR_CODES.USER_CANCELED;
  }

  if (error?.code) {
    return error.code;
  }

  const message = String(error?.message || "").toLowerCase();
  if (message.includes("gif") && message.includes("load")) {
    return ERROR_CODES.GIF_LOAD_FAILED;
  }

  return mapUnknownErrorCode(error, ERROR_CODES.DECODE_FAILED);
}

export async function convertImageToGif(file, options = {}, execution = {}) {
  const signal = execution.signal;
  const normalizedOptions = normalizeConversionOptions({
    ...options,
    lossless: false,
  });

  const fileSizeErrorCode = getFileSizeLimitErrorCode(file.size);
  if (fileSizeErrorCode) {
    return { ok: false, errorCode: fileSizeErrorCode };
  }

  const typeResult = await detectFileType(file);
  if (!typeResult.ok) {
    return { ok: false, errorCode: typeResult.errorCode };
  }
  if (typeResult.animated) {
    return { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_ANIMATED_IMAGE };
  }
  if (typeResult.video) {
    return { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_TYPE };
  }

  let decoded = null;
  let orientedCanvas = null;
  let resizedCanvas = null;

  try {
    throwIfAborted(signal);
    decoded = await decodeImage(file, signal);
    throwIfAborted(signal);

    const decodedDimensionsErrorCode = getDimensionsLimitErrorCode(
      decoded.width,
      decoded.height
    );
    if (decodedDimensionsErrorCode) {
      return { ok: false, errorCode: decodedDimensionsErrorCode };
    }

    const orientation =
      typeResult.type === "jpeg" ? await readJpegOrientation(file) : 1;
    const orientedDimensions = getOrientedDimensions(
      decoded.width,
      decoded.height,
      orientation
    );

    const orientationCanvasState = createCanvas(
      orientedDimensions.width,
      orientedDimensions.height
    );
    orientedCanvas = orientationCanvasState.canvas;
    const orientationContext = orientationCanvasState.context;

    applyOrientationTransform(
      orientationContext,
      orientation,
      decoded.width,
      decoded.height
    );
    orientationContext.drawImage(decoded.source, 0, 0);
    throwIfAborted(signal);

    const resizedDimensions = resolveResizeDimensions(
      orientedDimensions.width,
      orientedDimensions.height,
      normalizedOptions
    );

    const resizedDimensionsErrorCode = getDimensionsLimitErrorCode(
      resizedDimensions.width,
      resizedDimensions.height
    );
    if (resizedDimensionsErrorCode) {
      return { ok: false, errorCode: resizedDimensionsErrorCode };
    }

    resizedCanvas = await resizeCanvasWithPica({
      sourceCanvas: orientedCanvas,
      targetWidth: resizedDimensions.width,
      targetHeight: resizedDimensions.height,
      signal,
    });
    throwIfAborted(signal);

    const sourceImageData = canvasToImageData(resizedCanvas);
    const gifBytes = await encodeGifImageData({
      imageData: sourceImageData,
      options: {
        ...normalizedOptions,
        alphaBackground: options.alphaBackground,
        gifOptions: options.gifOptions,
      },
      signal,
    });
    throwIfAborted(signal);

    const blob = new Blob([gifBytes], { type: MIME_TYPES.GIF });
    if (!blob.size) {
      throw createEngineError(ERROR_CODES.GIF_ENCODE_FAILED);
    }

    const url = URL.createObjectURL(blob);

    return {
      ok: true,
      output: {
        blob,
        url,
        name: `${getBaseName(file.name)}.gif`,
        size: blob.size,
        width: resizedDimensions.width,
        height: resizedDimensions.height,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: mapGifErrorCode(error, signal),
    };
  } finally {
    decoded?.cleanup?.();
    if (orientedCanvas) {
      orientedCanvas.width = 0;
      orientedCanvas.height = 0;
    }
    if (resizedCanvas && resizedCanvas !== orientedCanvas) {
      resizedCanvas.width = 0;
      resizedCanvas.height = 0;
    }
  }
}

