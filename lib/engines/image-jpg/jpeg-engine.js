import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";
import {
  mapChromaSubsamplingToJpegEncodeOptions,
  mapEffortToJpegEncodeOptions,
} from "./effort-map";

let jpegEncodePromise = null;

function isJpegBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) {
    return false;
  }

  return (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  );
}

async function getJpegEncode() {
  if (!jpegEncodePromise) {
    jpegEncodePromise = import("@jsquash/jpeg/encode")
      .then((module) => module.default)
      .catch(() => {
        throw createEngineError(ERROR_CODES.JPEG_LOAD_FAILED);
      });
  }

  return jpegEncodePromise;
}

function buildJpegEncodeOptions(options) {
  return {
    quality: options.quality,
    progressive: options.progressive,
    baseline: !options.progressive,
    arithmetic: false,
    smoothing: 0,
    ...mapEffortToJpegEncodeOptions(options.effort),
    ...mapChromaSubsamplingToJpegEncodeOptions(options.chromaSubsampling),
  };
}

export async function encodeJpegImageData({ imageData, options, signal }) {
  throwIfAborted(signal);

  try {
    const encodeJpeg = await getJpegEncode();
    throwIfAborted(signal);

    const encodedBuffer = await encodeJpeg(
      imageData,
      buildJpegEncodeOptions(options)
    );
    throwIfAborted(signal);

    if (!(encodedBuffer instanceof ArrayBuffer)) {
      throw createEngineError(ERROR_CODES.JPEG_ENCODE_FAILED);
    }

    const encodedBytes = new Uint8Array(encodedBuffer);
    if (!isJpegBytes(encodedBytes)) {
      throw createEngineError(ERROR_CODES.JPEG_ENCODE_FAILED);
    }

    return encodedBytes;
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.JPEG_LOAD_FAILED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.JPEG_ENCODE_FAILED);
  }
}
