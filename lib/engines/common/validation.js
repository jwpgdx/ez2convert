import { CONVERSION_LIMITS } from "../../config/options-schema";
import { ERROR_CODES } from "../../constants/error-codes";

export function getFileSizeLimitErrorCode(
  fileSize,
  limits = CONVERSION_LIMITS
) {
  const size = Number(fileSize);
  if (!Number.isFinite(size)) {
    return null;
  }

  if (size > limits.maxFileSizeBytes) {
    return ERROR_CODES.EXCEEDS_FILE_SIZE_LIMIT;
  }

  return null;
}

export function getDimensionsLimitErrorCode(
  width,
  height,
  limits = CONVERSION_LIMITS
) {
  if (width > limits.maxDimension || height > limits.maxDimension) {
    return ERROR_CODES.EXCEEDS_DIMENSION_LIMIT;
  }

  if (width * height > limits.maxTotalPixels) {
    return ERROR_CODES.EXCEEDS_PIXEL_LIMIT;
  }

  return null;
}
