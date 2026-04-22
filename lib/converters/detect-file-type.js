import { ERROR_CODES } from "../constants/error-codes";
import { detectApng } from "./detect-apng";
import {
  RASTER_TYPE_IDS,
  isVideoMimeType,
  resolveTypeByMimeOrExtension,
} from "../config/file-types";

export async function detectFileType(file) {
  const resolvedType = resolveTypeByMimeOrExtension({
    mime: file.type,
    fileName: file.name,
  });

  if (resolvedType === RASTER_TYPE_IDS.UNKNOWN) {
    return { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_TYPE };
  }

  if (resolvedType === RASTER_TYPE_IDS.GIF) {
    return { ok: true, type: RASTER_TYPE_IDS.GIF, animated: true, video: false };
  }

  if (resolvedType === RASTER_TYPE_IDS.PNG) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (detectApng(arrayBuffer)) {
        return { ok: true, type: RASTER_TYPE_IDS.APNG, animated: true, video: false };
      }
    } catch {
      return { ok: false, errorCode: ERROR_CODES.DECODE_FAILED };
    }
  }

  if (isVideoMimeType(resolvedType)) {
    return { ok: true, type: resolvedType, animated: false, video: true };
  }

  return { ok: true, type: resolvedType, animated: false, video: false };
}
