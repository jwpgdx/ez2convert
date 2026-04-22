import { detectFileType } from "./detect-file-type";
import { ERROR_CODES } from "./error-messages";
import { mapUnknownErrorCode, throwIfAborted } from "../engines/common/errors";
import {
  normalizeConversionOptions,
  resolveResizeDimensions,
} from "../engines/common/resize";
import {
  getDimensionsLimitErrorCode,
  getFileSizeLimitErrorCode,
} from "../engines/common/validation";
import { encodeAnimatedToWebp } from "../engines/animated-webp/ffmpeg-engine";

function getBaseName(fileName) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

async function getImageDimensionsWithBitmap(file) {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return null;
  }
}

async function getImageDimensionsWithElement(file, signal) {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    const onAbort = () => {
      image.src = "";
      URL.revokeObjectURL(url);
      reject(new Error(ERROR_CODES.USER_CANCELED));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    image.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(result);
    };

    image.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
      reject(new Error(ERROR_CODES.DECODE_FAILED));
    };

    image.src = url;
  });
}

async function getAnimatedDimensions(file, signal) {
  throwIfAborted(signal);

  const bitmapDimensions = await getImageDimensionsWithBitmap(file);
  if (bitmapDimensions) {
    return bitmapDimensions;
  }

  return getImageDimensionsWithElement(file, signal);
}

function mapAnimatedErrorCode(error, signal) {
  if (signal?.aborted) {
    return ERROR_CODES.USER_CANCELED;
  }

  if (error?.message === ERROR_CODES.USER_CANCELED || error?.code === ERROR_CODES.USER_CANCELED) {
    return ERROR_CODES.USER_CANCELED;
  }

  if (
    error?.code === ERROR_CODES.FFMPEG_LOAD_FAILED ||
    error?.code === ERROR_CODES.ANIMATED_ENCODE_FAILED
  ) {
    return error.code;
  }

  const message = String(error?.message || "").toLowerCase();
  if (
    message.includes("worker") ||
    message.includes("ffmpeg core") ||
    message.includes("failed to fetch")
  ) {
    return ERROR_CODES.FFMPEG_LOAD_FAILED;
  }

  return mapUnknownErrorCode(error, ERROR_CODES.ANIMATED_ENCODE_FAILED);
}

export async function convertAnimatedToWebp(file, options = {}, execution = {}) {
  const signal = execution.signal;
  const normalizedOptions = normalizeConversionOptions(options);

  const fileSizeErrorCode = getFileSizeLimitErrorCode(file.size);
  if (fileSizeErrorCode) {
    return { ok: false, errorCode: fileSizeErrorCode };
  }

  const providedType = execution.detectedType;
  const typeResult =
    providedType === "gif" || providedType === "apng"
      ? { ok: true, type: providedType, animated: true }
      : await detectFileType(file);

  if (!typeResult.ok) {
    return { ok: false, errorCode: typeResult.errorCode };
  }

  if (!typeResult.animated) {
    return { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_TYPE };
  }

  try {
    throwIfAborted(signal);

    const dimensions = await getAnimatedDimensions(file, signal);
    const originalDimensionsErrorCode = getDimensionsLimitErrorCode(
      dimensions.width,
      dimensions.height
    );
    if (originalDimensionsErrorCode) {
      return { ok: false, errorCode: originalDimensionsErrorCode };
    }

    const resizedDimensions = resolveResizeDimensions(
      dimensions.width,
      dimensions.height,
      normalizedOptions
    );
    const resizedDimensionsErrorCode = getDimensionsLimitErrorCode(
      resizedDimensions.width,
      resizedDimensions.height
    );
    if (resizedDimensionsErrorCode) {
      return { ok: false, errorCode: resizedDimensionsErrorCode };
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    throwIfAborted(signal);

    const outputBytes = await encodeAnimatedToWebp({
      fileBytes: inputBytes,
      sourceType: typeResult.type,
      sourceWidth: dimensions.width,
      sourceHeight: dimensions.height,
      targetWidth: resizedDimensions.width,
      targetHeight: resizedDimensions.height,
      options: normalizedOptions,
      signal,
    });
    throwIfAborted(signal);

    const blob = new Blob([outputBytes], { type: "image/webp" });
    const url = URL.createObjectURL(blob);

    return {
      ok: true,
      output: {
        blob,
        url,
        name: `${getBaseName(file.name)}.webp`,
        size: blob.size,
        width: resizedDimensions.width,
        height: resizedDimensions.height,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: mapAnimatedErrorCode(error, signal),
    };
  }
}
