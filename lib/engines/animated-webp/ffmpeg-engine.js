import { CONVERSION_LIMITS, FRAME_DELAY_MODES } from "../../converters/constants";
import { ERROR_CODES } from "../../constants/error-codes";
import { createEngineError, throwIfAborted } from "../common/errors";
import { getAnimatedFfmpeg } from "./ffmpeg-loader";

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

function getInputExtension(type) {
  if (type === "gif") {
    return "gif";
  }
  if (type === "apng") {
    return "png";
  }
  return "bin";
}

function buildFilterChain({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  frameDelayMode,
  fps,
  dropDuplicateFrames,
}) {
  const filters = [];

  if (dropDuplicateFrames) {
    filters.push("mpdecimate");
  }

  if (frameDelayMode === FRAME_DELAY_MODES.NORMALIZE && fps) {
    filters.push(`fps=${fps}`);
  }

  if (targetWidth && targetHeight) {
    const needsResize = targetWidth !== sourceWidth || targetHeight !== sourceHeight;
    if (needsResize) {
      filters.push(`scale=${targetWidth}:${targetHeight}:flags=lanczos`);
    }
  }

  return filters;
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

export async function encodeAnimatedToWebp({
  fileBytes,
  sourceType,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  options,
  signal,
}) {
  throwIfAborted(signal);

  let ffmpeg;
  try {
    ffmpeg = await getAnimatedFfmpeg(signal);
  } catch (error) {
    if (signal?.aborted) {
      throw createEngineError(ERROR_CODES.USER_CANCELED);
    }
    throw createEngineError(ERROR_CODES.FFMPEG_LOAD_FAILED);
  }

  throwIfAborted(signal);

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputName = `input-${unique}.${getInputExtension(sourceType)}`;
  const outputName = `output-${unique}.webp`;

  const filters = buildFilterChain({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    frameDelayMode: options.frameDelayMode,
    fps: options.fps,
    dropDuplicateFrames: options.dropDuplicateFrames,
  });

  const args = [
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

    const exitCode = await ffmpeg.exec(args, 120_000, { signal });
    throwIfAborted(signal);

    if (exitCode !== 0) {
      throw createEngineError(ERROR_CODES.ANIMATED_ENCODE_FAILED);
    }

    const output = await ffmpeg.readFile(outputName, undefined, { signal });
    const outputBytes = toUint8Array(output);
    throwIfAborted(signal);

    if (!outputBytes.length || !isWebpBytes(outputBytes)) {
      throw createEngineError(ERROR_CODES.ANIMATED_ENCODE_FAILED);
    }

    if (outputBytes.length > CONVERSION_LIMITS.maxFileSizeBytes * 2) {
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

    throw createEngineError(ERROR_CODES.ANIMATED_ENCODE_FAILED);
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
