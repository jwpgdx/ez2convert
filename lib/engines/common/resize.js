import {
  CONVERSION_DEFAULTS,
  FRAME_DELAY_MODES,
  JPG_CHROMA_SUBSAMPLING,
  RESIZE_MODES,
} from "../../converters/constants";

export function normalizeQuality(quality) {
  const numeric = Number(quality);
  if (!Number.isFinite(numeric)) {
    return CONVERSION_DEFAULTS.quality;
  }
  return Math.round(Math.max(0, Math.min(100, numeric)));
}

export function normalizeEffort(effort) {
  const numeric = Number(effort);
  if (!Number.isFinite(numeric)) {
    return CONVERSION_DEFAULTS.effort;
  }
  return Math.round(Math.max(1, Math.min(6, numeric)));
}

export function normalizeResizeMode(mode) {
  if (Object.values(RESIZE_MODES).includes(mode)) {
    return mode;
  }
  return CONVERSION_DEFAULTS.resizeMode;
}

export function normalizeDimension(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.floor(numeric);
}

export function normalizeScalePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return CONVERSION_DEFAULTS.scalePercent;
  }
  return Math.round(Math.max(1, Math.min(1000, numeric)));
}

export function normalizeFps(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.min(120, Math.max(1, Math.round(numeric)));
}

export function normalizeLoop(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return CONVERSION_DEFAULTS.loop;
  }

  return Math.min(1000, Math.floor(numeric));
}

export function normalizeFrameDelayMode(mode) {
  if (Object.values(FRAME_DELAY_MODES).includes(mode)) {
    return mode;
  }
  return CONVERSION_DEFAULTS.frameDelayMode;
}

export function normalizeJpgChromaSubsampling(value) {
  if (Object.values(JPG_CHROMA_SUBSAMPLING).includes(value)) {
    return value;
  }
  return CONVERSION_DEFAULTS.chromaSubsampling;
}

function normalizeHexColor(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    return CONVERSION_DEFAULTS.alphaBackground;
  }
  return normalized;
}

function resolveMaxFitDimensions(width, height, maxWidth, maxHeight) {
  const targetMaxWidth = normalizeDimension(maxWidth);
  const targetMaxHeight = normalizeDimension(maxHeight);

  if (!targetMaxWidth && !targetMaxHeight) {
    return { width, height };
  }

  let ratio = 1;
  if (targetMaxWidth) {
    ratio = Math.min(ratio, targetMaxWidth / width);
  }
  if (targetMaxHeight) {
    ratio = Math.min(ratio, targetMaxHeight / height);
  }

  if (ratio >= 1) {
    return { width, height };
  }

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function resolveExactDimensions(width, height, exactWidth, exactHeight) {
  const targetWidth = normalizeDimension(exactWidth);
  const targetHeight = normalizeDimension(exactHeight);

  if (!targetWidth && !targetHeight) {
    return { width, height };
  }

  if (targetWidth && targetHeight) {
    return {
      width: targetWidth,
      height: targetHeight,
    };
  }

  if (targetWidth) {
    const ratio = targetWidth / width;
    return {
      width: targetWidth,
      height: Math.max(1, Math.round(height * ratio)),
    };
  }

  const ratio = targetHeight / height;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: targetHeight,
  };
}

export function resolveResizeDimensions(width, height, options = {}) {
  const mode = normalizeResizeMode(options.resizeMode);

  if (mode === RESIZE_MODES.ORIGINAL) {
    return { width, height };
  }

  if (mode === RESIZE_MODES.PERCENT) {
    const percent = normalizeScalePercent(options.scalePercent);
    const ratio = percent / 100;
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    };
  }

  if (mode === RESIZE_MODES.EXACT) {
    return resolveExactDimensions(
      width,
      height,
      options.exactWidth,
      options.exactHeight
    );
  }

  return resolveMaxFitDimensions(
    width,
    height,
    options.maxWidth,
    options.maxHeight
  );
}

export function normalizeConversionOptions(options = {}) {
  const lossless = Boolean(options.lossless);
  const quality = lossless
    ? 100
    : normalizeQuality(options.quality ?? CONVERSION_DEFAULTS.quality);

  return {
    quality,
    lossless,
    effort: normalizeEffort(options.effort ?? CONVERSION_DEFAULTS.effort),
    fps: normalizeFps(options.fps ?? CONVERSION_DEFAULTS.fps),
    loop: normalizeLoop(options.loop ?? CONVERSION_DEFAULTS.loop),
    frameDelayMode: normalizeFrameDelayMode(
      options.frameDelayMode ?? CONVERSION_DEFAULTS.frameDelayMode
    ),
    dropDuplicateFrames: Boolean(
      options.dropDuplicateFrames ?? CONVERSION_DEFAULTS.dropDuplicateFrames
    ),
    resizeMode: normalizeResizeMode(
      options.resizeMode ?? CONVERSION_DEFAULTS.resizeMode
    ),
    scalePercent: normalizeScalePercent(
      options.scalePercent ?? CONVERSION_DEFAULTS.scalePercent
    ),
    maxWidth: normalizeDimension(options.maxWidth),
    maxHeight: normalizeDimension(options.maxHeight),
    exactWidth: normalizeDimension(options.exactWidth),
    exactHeight: normalizeDimension(options.exactHeight),
  };
}

export function normalizeJpgConversionOptions(options = {}) {
  return {
    quality: normalizeQuality(options.quality ?? CONVERSION_DEFAULTS.quality),
    effort: normalizeEffort(options.effort ?? CONVERSION_DEFAULTS.effort),
    resizeMode: normalizeResizeMode(
      options.resizeMode ?? CONVERSION_DEFAULTS.resizeMode
    ),
    scalePercent: normalizeScalePercent(
      options.scalePercent ?? CONVERSION_DEFAULTS.scalePercent
    ),
    maxWidth: normalizeDimension(options.maxWidth),
    maxHeight: normalizeDimension(options.maxHeight),
    exactWidth: normalizeDimension(options.exactWidth),
    exactHeight: normalizeDimension(options.exactHeight),
    progressive:
      options.progressive === undefined
        ? CONVERSION_DEFAULTS.progressive
        : Boolean(options.progressive),
    chromaSubsampling: normalizeJpgChromaSubsampling(
      options.chromaSubsampling
    ),
    alphaBackground: normalizeHexColor(options.alphaBackground),
    stripMetadata:
      options.stripMetadata === undefined
        ? CONVERSION_DEFAULTS.stripMetadata
        : Boolean(options.stripMetadata),
  };
}
