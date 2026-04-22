import { CONVERSION_LIMITS } from "../../converters/constants";
import { ERROR_CODES } from "../../constants/error-codes";
import { createEngineError, throwIfAborted } from "../common/errors";
import { getVideoFfmpeg } from "./ffmpeg-loader";

function isWebpBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12) {
    return false;
  }

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  return new Uint8Array(data);
}

function normalizeTrimSeconds(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

function buildFilterChain({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  fps,
  scaleMode,
}) {
  const filters = [];

  if (fps) {
    filters.push(`fps=${fps}`);
  }

  if (targetWidth && targetHeight) {
    const needsResize =
      !sourceWidth ||
      !sourceHeight ||
      targetWidth !== sourceWidth ||
      targetHeight !== sourceHeight;

    if (needsResize) {
      if (scaleMode === "crop") {
        filters.push(
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase:flags=lanczos`
        );
        filters.push(`crop=${targetWidth}:${targetHeight}`);
      } else {
        filters.push(
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease:flags=lanczos`
        );
        filters.push(
          `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black@0`
        );
      }
    }
  }

  return filters;
}

function buildTrimArgs(trimStartSec, trimEndSec) {
  const args = [];
  const start = normalizeTrimSeconds(trimStartSec);
  const end = normalizeTrimSeconds(trimEndSec);

  if (start !== null) {
    args.push("-ss", String(start));
  }

  if (end !== null) {
    const duration = start !== null ? end - start : end;
    if (duration > 0) {
      args.push("-t", String(duration));
    }
  }

  return args;
}

export async function encodeVideoToWebp({
  fileBytes,
  sourceType,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  options,
  signal,
}) {
  void sourceType;

  throwIfAborted(signal);

  let ffmpeg;
  try {
    ffmpeg = await getVideoFfmpeg(signal);
  } catch {
    if (signal?.aborted) {
      throw createEngineError(ERROR_CODES.USER_CANCELED);
    }
    throw createEngineError(ERROR_CODES.FFMPEG_LOAD_FAILED);
  }

  throwIfAborted(signal);

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputName = `video-input-${unique}.bin`;
  const outputName = `video-output-${unique}.webp`;

  const filters = buildFilterChain({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    fps: options.fps,
    scaleMode: options.scaleMode,
  });

  const args = [
    ...buildTrimArgs(options.trimStartSec, options.trimEndSec),
    "-i",
    inputName,
    "-an",
    "-c:v",
    "libwebp",
    "-lossless",
    options.lossless ? "1" : "0",
    "-compression_level",
    String(options.effort),
    "-q:v",
    String(options.quality),
    "-loop",
    String(options.loop),
    "-pix_fmt",
    "yuva420p",
    "-vsync",
    "0",
  ];

  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }

  args.push(outputName);

  try {
    await ffmpeg.writeFile(inputName, fileBytes, { signal });
    throwIfAborted(signal);

    const exitCode = await ffmpeg.exec(args, 180_000, { signal });
    throwIfAborted(signal);

    if (exitCode !== 0) {
      throw createEngineError(ERROR_CODES.VIDEO_ENCODE_FAILED);
    }

    const output = await ffmpeg.readFile(outputName, undefined, { signal });
    const outputBytes = toUint8Array(output);
    throwIfAborted(signal);

    if (!outputBytes.length || !isWebpBytes(outputBytes)) {
      throw createEngineError(ERROR_CODES.VIDEO_ENCODE_FAILED);
    }

    if (outputBytes.length > CONVERSION_LIMITS.maxFileSizeBytes * 4) {
      throw createEngineError(ERROR_CODES.OUT_OF_MEMORY);
    }

    return outputBytes;
  } catch (error) {
    if (signal?.aborted) {
      throw createEngineError(ERROR_CODES.USER_CANCELED);
    }

    if (error?.code) {
      throw error;
    }

    throw createEngineError(ERROR_CODES.VIDEO_ENCODE_FAILED);
  } finally {
    try {
      await ffmpeg.deleteFile(inputName, { signal });
    } catch {
      // no-op
    }
    try {
      await ffmpeg.deleteFile(outputName, { signal });
    } catch {
      // no-op
    }
  }
}
