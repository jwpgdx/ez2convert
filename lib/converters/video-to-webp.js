import { detectFileType } from "./detect-file-type";
import { CONVERSION_LIMITS, VIDEO_SCALE_MODES } from "./constants";
import { mapUnknownErrorCode, throwIfAborted } from "../engines/common/errors";
import {
  normalizeConversionOptions,
  resolveResizeDimensions,
} from "../engines/common/resize";
import {
  getDimensionsLimitErrorCode,
  getFileSizeLimitErrorCode,
} from "../engines/common/validation";
import { encodeVideoToWebp } from "../engines/video-webp/ffmpeg-engine";
import { ERROR_CODES } from "../constants/error-codes";
import { isVideoMimeType } from "../config/file-types";

function isVideoType(value) {
  return isVideoMimeType(value);
}

function getBaseName(fileName) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

function toNullablePositiveInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

function normalizeVideoScaleMode(value) {
  return value === VIDEO_SCALE_MODES.CROP
    ? VIDEO_SCALE_MODES.CROP
    : VIDEO_SCALE_MODES.FIT;
}

function resolveDurationWindow(totalDurationSec, trimStartSec, trimEndSec) {
  if (!Number.isFinite(totalDurationSec) || totalDurationSec <= 0) {
    return null;
  }

  const start = Math.max(0, trimStartSec ?? 0);
  const endRaw = trimEndSec ?? totalDurationSec;
  const end = Math.min(totalDurationSec, Math.max(0, endRaw));
  const durationSec = Math.max(0, end - start);

  return {
    start,
    end,
    durationSec,
  };
}

function getVideoLimitsErrorCode(durationSec, estimatedFps, limits) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }

  if (durationSec > limits.maxDurationSec) {
    return ERROR_CODES.EXCEEDS_VIDEO_DURATION_LIMIT;
  }

  const frames = Math.ceil(durationSec * estimatedFps);
  if (frames > limits.maxFrames) {
    return ERROR_CODES.EXCEEDS_VIDEO_FRAMES_LIMIT;
  }

  return null;
}

async function readVideoMetadata(file, signal) {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;

    const finish = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      fn(value);
    };

    const finalizeResolve = () => {
      const width = Number(video.videoWidth) || 0;
      const height = Number(video.videoHeight) || 0;
      const duration = Number(video.duration);

      finish(resolve, {
        width: width > 0 ? width : null,
        height: height > 0 ? height : null,
        duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      });
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.ontimeupdate = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    const onAbort = () => {
      finish(reject, new Error(ERROR_CODES.USER_CANCELED));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      if (Number.isFinite(duration) && duration > 0) {
        finalizeResolve();
        return;
      }

      // For some recorded WebM files duration starts as Infinity/NaN.
      video.ontimeupdate = () => {
        finalizeResolve();
      };

      try {
        video.currentTime = 1e101;
      } catch {
        finalizeResolve();
      }
    };

    video.onerror = () => {
      finish(reject, new Error(ERROR_CODES.DECODE_FAILED));
    };

    video.src = url;
  });
}

function mapVideoErrorCode(error, signal) {
  if (signal?.aborted) {
    return ERROR_CODES.USER_CANCELED;
  }

  if (error?.message === ERROR_CODES.USER_CANCELED || error?.code === ERROR_CODES.USER_CANCELED) {
    return ERROR_CODES.USER_CANCELED;
  }

  if (
    error?.code === ERROR_CODES.FFMPEG_LOAD_FAILED ||
    error?.code === ERROR_CODES.VIDEO_ENCODE_FAILED ||
    error?.code === ERROR_CODES.OUT_OF_MEMORY
  ) {
    return error.code;
  }

  const message = String(error?.message || "").toLowerCase();
  if (
    message.includes("worker") ||
    message.includes("ffmpeg core") ||
    message.includes("failed to fetch")
  ) {
    return ERROR_CODES.FFMPEG_LOAD_FAILED;
  }

  return mapUnknownErrorCode(error, ERROR_CODES.VIDEO_ENCODE_FAILED);
}

export async function convertVideoToWebp(file, options = {}, execution = {}) {
  const signal = execution.signal;
  const normalizedOptions = normalizeConversionOptions(options);
  const requestedMaxDurationSec = toNullableNumber(options.maxDurationSec);
  const requestedMaxFrames = toNullablePositiveInteger(options.maxFrames);
  const videoOptions = {
    trimStartSec: toNullableNumber(options.trimStartSec),
    trimEndSec: toNullableNumber(options.trimEndSec),
    maxDurationSec:
      requestedMaxDurationSec === null
        ? CONVERSION_LIMITS.maxVideoDurationSec
        : Math.min(requestedMaxDurationSec, CONVERSION_LIMITS.maxVideoDurationSec),
    maxFrames:
      requestedMaxFrames === null
        ? CONVERSION_LIMITS.maxVideoFrames
        : Math.min(requestedMaxFrames, CONVERSION_LIMITS.maxVideoFrames),
    scaleMode: normalizeVideoScaleMode(options.scaleMode),
  };

  const fileSizeErrorCode = getFileSizeLimitErrorCode(file.size);
  if (fileSizeErrorCode) {
    return { ok: false, errorCode: fileSizeErrorCode };
  }

  const providedType = execution.detectedType;
  const typeResult = isVideoType(providedType)
    ? { ok: true, type: providedType, video: true }
    : await detectFileType(file);

  if (!typeResult.ok) {
    return { ok: false, errorCode: typeResult.errorCode };
  }

  if (!typeResult.video) {
    return { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_TYPE };
  }

  try {
    throwIfAborted(signal);

    let sourceWidth = null;
    let sourceHeight = null;
    let targetWidth = null;
    let targetHeight = null;

    try {
      const metadata = await readVideoMetadata(file, signal);
      sourceWidth = metadata.width;
      sourceHeight = metadata.height;

      const estimatedFps = normalizedOptions.fps || 30;
      const durationWindow = resolveDurationWindow(
        metadata.duration,
        videoOptions.trimStartSec,
        videoOptions.trimEndSec
      );
      const limitsErrorCode = getVideoLimitsErrorCode(
        durationWindow?.durationSec,
        estimatedFps,
        {
          maxDurationSec: videoOptions.maxDurationSec,
          maxFrames: videoOptions.maxFrames,
        }
      );
      if (limitsErrorCode) {
        return { ok: false, errorCode: limitsErrorCode };
      }
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      // If browser metadata probe fails, ffmpeg path can still attempt conversion.
    }

    if (sourceWidth && sourceHeight) {
      const sourceDimensionsErrorCode = getDimensionsLimitErrorCode(
        sourceWidth,
        sourceHeight
      );
      if (sourceDimensionsErrorCode) {
        return { ok: false, errorCode: sourceDimensionsErrorCode };
      }

      const resolvedDimensions = resolveResizeDimensions(
        sourceWidth,
        sourceHeight,
        normalizedOptions
      );
      targetWidth = resolvedDimensions.width;
      targetHeight = resolvedDimensions.height;

      const targetDimensionsErrorCode = getDimensionsLimitErrorCode(
        targetWidth,
        targetHeight
      );
      if (targetDimensionsErrorCode) {
        return { ok: false, errorCode: targetDimensionsErrorCode };
      }
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    throwIfAborted(signal);

    const outputBytes = await encodeVideoToWebp({
      fileBytes: inputBytes,
      sourceType: typeResult.type,
      sourceWidth,
      sourceHeight,
      targetWidth,
      targetHeight,
      options: {
        ...normalizedOptions,
        ...videoOptions,
      },
      signal,
    });
    throwIfAborted(signal);

    const blob = new Blob([outputBytes], { type: "image/webp" });
    const url = URL.createObjectURL(blob);

    return {
      ok: true,
      output: {
        blob,
        url,
        name: `${getBaseName(file.name)}.webp`,
        size: blob.size,
        width: targetWidth || sourceWidth || null,
        height: targetHeight || sourceHeight || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: mapVideoErrorCode(error, signal),
    };
  }
}
