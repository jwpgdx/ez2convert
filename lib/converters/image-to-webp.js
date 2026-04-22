import { detectFileType } from "./detect-file-type";
import { ERROR_CODES } from "./error-messages";
import {
  applyOrientationTransform,
  getOrientedDimensions,
  readJpegOrientation,
} from "./image-orientation";
import {
  createEngineError,
  mapEncodeError,
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

let webpEncoderPromise = null;

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

function isWebpBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12) {
    return false;
  }

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

async function getWebpEncoder() {
  if (!webpEncoderPromise) {
    webpEncoderPromise = import("@jsquash/webp/encode").then(
      (module) => module.default
    );
  }
  return webpEncoderPromise;
}

function buildEncodeOptions({ quality, lossless, effort }) {
  return {
    quality,
    lossless: lossless ? 1 : 0,
    method: effort,
  };
}

async function encodeCanvasToWebp(canvas, encodeConfig, signal) {
  throwIfAborted(signal);

  try {
    const context = canvas.getContext("2d");
    if (!context) {
      throw createEngineError(ERROR_CODES.ENCODE_FAILED);
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    throwIfAborted(signal);

    const encodeWebp = await getWebpEncoder();
    const encodedBuffer = await encodeWebp(
      imageData,
      buildEncodeOptions(encodeConfig)
    );
    const encodedBytes = new Uint8Array(encodedBuffer);
    throwIfAborted(signal);

    if (!isWebpBytes(encodedBytes)) {
      throw createEngineError(ERROR_CODES.ENCODE_FAILED);
    }

    const blob = new Blob([encodedBytes], { type: "image/webp" });
    if (!blob.size) {
      throw createEngineError(ERROR_CODES.ENCODE_FAILED);
    }

    return blob;
  } catch (error) {
    throw mapEncodeError(error);
  }
}

export async function convertImageToWebp(file, options = {}, execution = {}) {
  const signal = execution.signal;
  const normalizedOptions = normalizeConversionOptions(options);

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

  let decoded = null;
  let orientedCanvas = null;
  let outputCanvas = null;

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

    const outputCanvasState = createCanvas(
      resizedDimensions.width,
      resizedDimensions.height
    );
    outputCanvas = outputCanvasState.canvas;
    outputCanvasState.context.drawImage(
      orientedCanvas,
      0,
      0,
      resizedDimensions.width,
      resizedDimensions.height
    );
    throwIfAborted(signal);

    const blob = await encodeCanvasToWebp(outputCanvas, normalizedOptions, signal);
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
      errorCode: mapUnknownErrorCode(error, ERROR_CODES.DECODE_FAILED),
    };
  } finally {
    decoded?.cleanup?.();
    if (orientedCanvas) {
      orientedCanvas.width = 0;
      orientedCanvas.height = 0;
    }
    if (outputCanvas) {
      outputCanvas.width = 0;
      outputCanvas.height = 0;
    }
  }
}
