import { ERROR_CODES } from "../../constants/error-codes";

const KNOWN_ERROR_CODES = new Set(Object.values(ERROR_CODES));

export function createEngineError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function throwIfAborted(signal) {
  if (!signal?.aborted) {
    return;
  }
  throw createEngineError(ERROR_CODES.USER_CANCELED);
}

export function mapUnknownErrorCode(
  error,
  fallbackCode = ERROR_CODES.DECODE_FAILED
) {
  if (!error) {
    return fallbackCode;
  }

  if (error.code && KNOWN_ERROR_CODES.has(error.code)) {
    return error.code;
  }

  const message = String(error.message || "").toLowerCase();
  if (message.includes("out of memory") || message.includes("allocation")) {
    return ERROR_CODES.OUT_OF_MEMORY;
  }

  return fallbackCode;
}

export function mapEncodeError(error) {
  if (error?.code && KNOWN_ERROR_CODES.has(error.code)) {
    return error;
  }

  const code = mapUnknownErrorCode(error, ERROR_CODES.ENCODE_FAILED);
  return createEngineError(code);
}
