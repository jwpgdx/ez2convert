import { createEngineError } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";

let avifWorker = null;
let requestIdSeed = 0;
const pendingRequests = new Map();

function terminateWorker() {
  if (!avifWorker) {
    return;
  }

  avifWorker.terminate();
  avifWorker = null;
}

function rejectAllPending(code) {
  for (const { reject, cleanup } of pendingRequests.values()) {
    cleanup?.();
    reject(createEngineError(code));
  }
  pendingRequests.clear();
}

function ensureWorker() {
  if (avifWorker) {
    return avifWorker;
  }

  avifWorker = new Worker(new URL("../../../workers/avif.worker.js", import.meta.url), {
    type: "module",
  });

  avifWorker.onmessage = (event) => {
    const message = event?.data;
    const id = message?.id;
    if (!id) {
      return;
    }

    const pending = pendingRequests.get(id);
    if (!pending) {
      return;
    }

    pendingRequests.delete(id);
    pending.cleanup?.();

    if (message.ok && message.buffer instanceof ArrayBuffer) {
      pending.resolve(message.buffer);
      return;
    }

    pending.reject(
      createEngineError(message?.errorCode || ERROR_CODES.AVIF_ENCODE_FAILED)
    );
  };

  avifWorker.onerror = () => {
    rejectAllPending(ERROR_CODES.AVIF_LOAD_FAILED);
    terminateWorker();
  };

  return avifWorker;
}

export function encodeAvifInWorker({ imageData, options, signal }) {
  return new Promise((resolve, reject) => {
    const id = `${++requestIdSeed}`;
    const worker = ensureWorker();
    const rgba = imageData.data;

    const onAbort = () => {
      rejectAllPending(ERROR_CODES.USER_CANCELED);
      terminateWorker();
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      pendingRequests.set(id, {
        resolve,
        reject,
        cleanup: () => {
          signal?.removeEventListener("abort", onAbort);
        },
      });
      worker.postMessage(
        {
          type: "encode",
          id,
          data: rgba,
          width: imageData.width,
          height: imageData.height,
          options,
        },
        [rgba.buffer]
      );
    } catch (error) {
      pendingRequests.delete(id);
      signal?.removeEventListener("abort", onAbort);
      reject(createEngineError(ERROR_CODES.AVIF_LOAD_FAILED));
    }
  });
}
