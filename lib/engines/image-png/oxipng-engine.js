import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";
import { mapEffortToOxipngLevel } from "./effort-map";

let oxipngOptimisePromise = null;

async function getOxipngOptimise() {
  if (!oxipngOptimisePromise) {
    oxipngOptimisePromise = import("@jsquash/oxipng")
      .then((module) => module.optimise)
      .catch(() => {
        throw createEngineError(ERROR_CODES.OXIPNG_LOAD_FAILED);
      });
  }

  return oxipngOptimisePromise;
}

export async function optimisePngImageData({ imageData, effort, signal }) {
  throwIfAborted(signal);

  try {
    const optimise = await getOxipngOptimise();
    throwIfAborted(signal);

    const encoded = await optimise(imageData, {
      level: mapEffortToOxipngLevel(effort),
      interlace: false,
      optimiseAlpha: true,
    });
    throwIfAborted(signal);

    if (!(encoded instanceof ArrayBuffer)) {
      throw createEngineError(ERROR_CODES.OXIPNG_ENCODE_FAILED);
    }

    return new Uint8Array(encoded);
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.OXIPNG_LOAD_FAILED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.OXIPNG_ENCODE_FAILED);
  }
}
