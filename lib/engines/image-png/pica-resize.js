import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";

let picaPromise = null;

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function getPicaInstance() {
  if (!picaPromise) {
    picaPromise = import("pica")
      .then((module) => {
        const createPica = module.default;
        return createPica();
      })
      .catch(() => {
        throw createEngineError(ERROR_CODES.ENCODE_FAILED);
      });
  }

  return picaPromise;
}

function getCancelToken(signal) {
  if (!signal) {
    return null;
  }

  if (signal.aborted) {
    return Promise.reject(createEngineError(ERROR_CODES.USER_CANCELED));
  }

  return new Promise((_, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(createEngineError(ERROR_CODES.USER_CANCELED));
      },
      { once: true }
    );
  });
}

export async function resizeCanvasWithPica({
  sourceCanvas,
  targetWidth,
  targetHeight,
  signal,
}) {
  throwIfAborted(signal);

  if (
    sourceCanvas.width === targetWidth &&
    sourceCanvas.height === targetHeight
  ) {
    return sourceCanvas;
  }

  const targetCanvas = createCanvas(targetWidth, targetHeight);

  try {
    const pica = await getPicaInstance();
    throwIfAborted(signal);

    await pica.resize(sourceCanvas, targetCanvas, {
      cancelToken: getCancelToken(signal),
    });

    throwIfAborted(signal);
    return targetCanvas;
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.ENCODE_FAILED);
  }
}
