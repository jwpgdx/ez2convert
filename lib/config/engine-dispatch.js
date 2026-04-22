import { isVideoMimeType } from "./file-types";

export const ENGINE_KINDS = Object.freeze({
  STATIC_IMAGE: "static-image",
  ANIMATED_IMAGE: "animated-image",
  VIDEO: "video",
});

export const ENGINE_LABELS = Object.freeze({
  [ENGINE_KINDS.STATIC_IMAGE]: "image(static)",
  [ENGINE_KINDS.ANIMATED_IMAGE]: "ffmpeg(animated)",
  [ENGINE_KINDS.VIDEO]: "ffmpeg(video)",
});

export function resolveEngineKindFromTypeResult(typeResult) {
  if (typeResult?.video) {
    return ENGINE_KINDS.VIDEO;
  }
  if (typeResult?.animated) {
    return ENGINE_KINDS.ANIMATED_IMAGE;
  }
  return ENGINE_KINDS.STATIC_IMAGE;
}

export function resolveEngineKindFromQueueItem(item) {
  if (item?.input?.isVideo) {
    return ENGINE_KINDS.VIDEO;
  }
  if (item?.input?.isAnimated) {
    return ENGINE_KINDS.ANIMATED_IMAGE;
  }

  const inputMime = String(item?.input?.type || "").toLowerCase();
  if (isVideoMimeType(inputMime)) {
    return ENGINE_KINDS.VIDEO;
  }

  const detectedType = String(item?.input?.detectedType || "").toLowerCase();
  if (isVideoMimeType(detectedType)) {
    return ENGINE_KINDS.VIDEO;
  }

  return ENGINE_KINDS.STATIC_IMAGE;
}

export function resolveEngineLabel(kind) {
  return ENGINE_LABELS[kind] || ENGINE_LABELS[ENGINE_KINDS.STATIC_IMAGE];
}
