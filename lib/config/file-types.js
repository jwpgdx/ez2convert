export const RASTER_TYPE_IDS = Object.freeze({
  JPEG: "jpeg",
  PNG: "png",
  WEBP: "webp",
  GIF: "gif",
  APNG: "apng",
  UNKNOWN: "unknown",
});

export const MIME_TYPES = Object.freeze({
  JPG: "image/jpg",
  JPEG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  WEBP: "image/webp",
  AVIF: "image/avif",
  VIDEO_MP4: "video/mp4",
  VIDEO_WEBM: "video/webm",
  VIDEO_QUICKTIME: "video/quicktime",
  VIDEO_AVI: "video/x-msvideo",
  VIDEO_MKV: "video/x-matroska",
  VIDEO_MPEG: "video/mpeg",
});

export const UPLOAD_ACCEPT = "image/*,video/*";
export const SUPPORTED_INPUT_DESCRIPTION =
  "JPG/PNG/GIF/APNG + video formats";
export const IMAGE_UPLOAD_ACCEPT = "image/*";
export const SUPPORTED_STATIC_INPUT_DESCRIPTION =
  "JPG/JPEG/PNG/WEBP (static)";

export const JPEG_MIME_TYPES = Object.freeze([MIME_TYPES.JPEG, MIME_TYPES.JPG]);
export const VIDEO_MIME_TYPES = Object.freeze([
  MIME_TYPES.VIDEO_MP4,
  MIME_TYPES.VIDEO_WEBM,
  MIME_TYPES.VIDEO_QUICKTIME,
  MIME_TYPES.VIDEO_AVI,
  MIME_TYPES.VIDEO_MKV,
  MIME_TYPES.VIDEO_MPEG,
]);

export const VIDEO_EXTENSION_TO_MIME = Object.freeze({
  mp4: MIME_TYPES.VIDEO_MP4,
  m4v: MIME_TYPES.VIDEO_MP4,
  webm: MIME_TYPES.VIDEO_WEBM,
  mov: MIME_TYPES.VIDEO_QUICKTIME,
  avi: MIME_TYPES.VIDEO_AVI,
  mkv: MIME_TYPES.VIDEO_MKV,
  mpg: MIME_TYPES.VIDEO_MPEG,
  mpeg: MIME_TYPES.VIDEO_MPEG,
});

export const RASTER_EXTENSION_TO_TYPE = Object.freeze({
  jpg: RASTER_TYPE_IDS.JPEG,
  jpeg: RASTER_TYPE_IDS.JPEG,
  png: RASTER_TYPE_IDS.PNG,
  webp: RASTER_TYPE_IDS.WEBP,
  gif: RASTER_TYPE_IDS.GIF,
});

const JPEG_MIME_SET = new Set(JPEG_MIME_TYPES);
const VIDEO_MIME_SET = new Set(VIDEO_MIME_TYPES);

export function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

export function isVideoMimeType(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.startsWith("video/") || VIDEO_MIME_SET.has(normalized);
}

export function isAnimatedTypeId(typeId) {
  return (
    typeId === RASTER_TYPE_IDS.GIF || typeId === RASTER_TYPE_IDS.APNG
  );
}

export function resolveTypeByMimeOrExtension({ mime, fileName }) {
  const normalizedMime = String(mime || "").toLowerCase();

  if (JPEG_MIME_SET.has(normalizedMime)) {
    return RASTER_TYPE_IDS.JPEG;
  }
  if (normalizedMime === MIME_TYPES.PNG) {
    return RASTER_TYPE_IDS.PNG;
  }
  if (normalizedMime === MIME_TYPES.WEBP) {
    return RASTER_TYPE_IDS.WEBP;
  }
  if (normalizedMime === MIME_TYPES.GIF) {
    return RASTER_TYPE_IDS.GIF;
  }
  if (isVideoMimeType(normalizedMime)) {
    return normalizedMime;
  }

  const extension = getFileExtension(fileName);
  if (RASTER_EXTENSION_TO_TYPE[extension]) {
    return RASTER_EXTENSION_TO_TYPE[extension];
  }
  if (VIDEO_EXTENSION_TO_MIME[extension]) {
    return VIDEO_EXTENSION_TO_MIME[extension];
  }

  return RASTER_TYPE_IDS.UNKNOWN;
}
