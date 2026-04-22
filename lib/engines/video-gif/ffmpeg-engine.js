import { CONVERSION_LIMITS } from "../../converters/constants";
import { ERROR_CODES } from "../../constants/error-codes";
import { createEngineError, throwIfAborted } from "../common/errors";
import { getVideoFfmpeg } from "../video-webp/ffmpeg-loader";
import { GIF_DITHER_MODES } from "../../converters/constants";

function isGifBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 6) {
    return false;
  }

  return (
    bytes[0] === 0x47 && // G
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x38 && // 8
    (bytes[4] === 0x37 || bytes[4] === 0x39) && // 7|9
    bytes[5] === 0x61 // a
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

function mapQualityToMaxColors(quality) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(quality) || 100)));
  if (normalized >= 100) {
    return 256;
  }

  // Keep palette floor at 16 to avoid severe posterization on photos.
  return Math.max(16, Math.round(16 + (normalized / 100) * 240));
}

function mapEffortToPaletteStatsMode(effort) {
  const value = Math.round(Math.max(1, Math.min(6, Number(effort) || 4)));
  return value >= 5 ? "full" : "diff";
}

function mapDitherToPaletteuse(dither) {
  switch (dither) {
    case GIF_DITHER_MODES.NONE:
      return { dither: "none" };
    case GIF_DITHER_MODES.BAYER:
      return { dither: "bayer", bayerScale: 4 };
    case GIF_DITHER_MODES.FLOYD:
    default:
      return { dither: "floyd_steinberg" };
  }
}

function buildVideoFilters({
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

function buildFilterComplex({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  options,
}) {
  const baseFilters = buildVideoFilters({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    fps: options.fps,
    scaleMode: options.scaleMode,
  });

  const maxColors = mapQualityToMaxColors(options.quality);
  const statsMode = mapEffortToPaletteStatsMode(options.effort);
  const ditherConfig = mapDitherToPaletteuse(options?.gifOptions?.dither);

  const palettegen = `palettegen=max_colors=${maxColors}:stats_mode=${statsMode}`;
  let paletteuse = `paletteuse=dither=${ditherConfig.dither}`;
  if (ditherConfig.bayerScale !== undefined) {
    paletteuse += `:bayer_scale=${ditherConfig.bayerScale}`;
  }

  const basePrefix = baseFilters.length > 0 ? `${baseFilters.join(",")},` : "";
  return `[0:v]${basePrefix}split[s0][s1];[s0]${palettegen}[p];[s1][p]${paletteuse}`;
}

export async function encodeVideoToGif({
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
  const outputName = `video-output-${unique}.gif`;

  const filterComplex = buildFilterComplex({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    options,
  });

  const args = [
    ...buildTrimArgs(options.trimStartSec, options.trimEndSec),
    "-i",
    inputName,
    "-an",
    "-filter_complex",
    filterComplex,
    "-loop",
    String(options.loop ?? 0),
    "-gifflags",
    "+transdiff",
    "-vsync",
    "0",
    outputName,
  ];

  try {
    await ffmpeg.writeFile(inputName, fileBytes, { signal });
    throwIfAborted(signal);

    const exitCode = await ffmpeg.exec(args, 240_000, { signal });
    throwIfAborted(signal);

    if (exitCode !== 0) {
      throw createEngineError(ERROR_CODES.VIDEO_GIF_ENCODE_FAILED);
    }

    const output = await ffmpeg.readFile(outputName, undefined, { signal });
    const outputBytes = toUint8Array(output);
    throwIfAborted(signal);

    if (!outputBytes.length || !isGifBytes(outputBytes)) {
      throw createEngineError(ERROR_CODES.VIDEO_GIF_ENCODE_FAILED);
    }

    if (outputBytes.length > CONVERSION_LIMITS.maxFileSizeBytes * 6) {
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

    throw createEngineError(ERROR_CODES.VIDEO_GIF_ENCODE_FAILED);
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

