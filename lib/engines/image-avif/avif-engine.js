import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";
import { mapEffortToAvifSpeed } from "./effort-map";
import { encodeAvifInWorker } from "./avif-worker-client";

function isAvifBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12) {
    return false;
  }

  // ISO BMFF container should start with a size then the `ftyp` box.
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

function mapTune(tune) {
  if (tune === "ssim") {
    return 2;
  }
  return undefined;
}

function mapChromaSubsampling(chroma) {
  if (chroma === "4:2:0") {
    return 1;
  }
  if (chroma === "4:4:4") {
    return 3;
  }
  return undefined;
}

function buildAvifEncodeOptions(options) {
  const avifOptions = options?.avifOptions || {};

  const encodeOptions = {
    quality: options.quality,
    lossless: Boolean(options.lossless),
    speed: mapEffortToAvifSpeed(options.effort),
  };

  const tune = mapTune(avifOptions.tune);
  if (tune !== undefined) {
    encodeOptions.tune = tune;
  }

  const subsample = mapChromaSubsampling(avifOptions.chromaSubsampling);
  if (subsample !== undefined) {
    encodeOptions.subsample = subsample;
  }

  return encodeOptions;
}

export async function encodeAvifImageData({ imageData, options, signal }) {
  throwIfAborted(signal);

  try {
    const encodedBuffer = await encodeAvifInWorker({
      imageData,
      options: buildAvifEncodeOptions(options),
      signal,
    });
    throwIfAborted(signal);

    const encodedBytes = new Uint8Array(encodedBuffer);
    if (!isAvifBytes(encodedBytes)) {
      throw createEngineError(ERROR_CODES.AVIF_ENCODE_FAILED);
    }

    return encodedBytes;
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.AVIF_LOAD_FAILED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.AVIF_ENCODE_FAILED);
  }
}

