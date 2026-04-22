import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";

export async function encodeCanvasToJpegBlob({ canvas, quality, signal }) {
  throwIfAborted(signal);

  if (!canvas || typeof canvas.toBlob !== "function") {
    throw createEngineError(ERROR_CODES.JPEG_FALLBACK_FAILED);
  }

  try {
    const blob = await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(createEngineError(ERROR_CODES.JPEG_FALLBACK_FAILED));
      }, 4000);

      const onAbort = () => {
        window.clearTimeout(timeoutId);
        reject(createEngineError(ERROR_CODES.USER_CANCELED));
      };

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }

      canvas.toBlob(
        (value) => {
          window.clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
          if (!value) {
            reject(createEngineError(ERROR_CODES.JPEG_FALLBACK_FAILED));
            return;
          }
          resolve(value);
        },
        "image/jpeg",
        quality
      );
    });
    throwIfAborted(signal);

    if (!blob.size || blob.type !== "image/jpeg") {
      throw createEngineError(ERROR_CODES.JPEG_FALLBACK_FAILED);
    }

    return blob;
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.JPEG_FALLBACK_FAILED);
  }
}
