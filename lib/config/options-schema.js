export const CONVERSION_LIMITS = Object.freeze({
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxDimension: 8192,
  maxTotalPixels: 25_000_000,
  maxVideoDurationSec: 120,
  maxVideoFrames: 3600,
  maxBatchFiles: 50,
  warnZipTotalBytes: 300 * 1024 * 1024,
  maxZipTotalBytes: 500 * 1024 * 1024,
});

export const RESIZE_MODES = Object.freeze({
  ORIGINAL: "original",
  PERCENT: "percent",
  MAX: "max",
  EXACT: "exact",
});

export const FRAME_DELAY_MODES = Object.freeze({
  ORIGINAL: "original",
  NORMALIZE: "normalize",
});

export const VIDEO_SCALE_MODES = Object.freeze({
  FIT: "fit",
  CROP: "crop",
});

export const JPG_CHROMA_SUBSAMPLING = Object.freeze({
  AUTO: "auto",
  CHROMA_420: "4:2:0",
  CHROMA_444: "4:4:4",
});

export const AVIF_CHROMA_SUBSAMPLING = Object.freeze({
  AUTO: "auto",
  CHROMA_420: "4:2:0",
  CHROMA_444: "4:4:4",
});

export const AVIF_TUNES = Object.freeze({
  AUTO: "auto",
  SSIM: "ssim",
});

export const GIF_ALPHA_MODES = Object.freeze({
  PRESERVE: "preserve",
  FLATTEN: "flatten",
});

export const GIF_DITHER_MODES = Object.freeze({
  NONE: "none",
  BAYER: "bayer",
  FLOYD: "floyd",
});

export const CONVERSION_DEFAULTS = Object.freeze({
  quality: 80,
  lossless: false,
  effort: 4,
  fps: null,
  loop: 0,
  frameDelayMode: FRAME_DELAY_MODES.ORIGINAL,
  dropDuplicateFrames: false,
  resizeMode: RESIZE_MODES.ORIGINAL,
  scalePercent: 100,
  maxWidth: null,
  maxHeight: null,
  exactWidth: null,
  exactHeight: null,
  progressive: true,
  chromaSubsampling: JPG_CHROMA_SUBSAMPLING.AUTO,
  alphaBackground: "#FFFFFF",
  stripMetadata: true,
});

const COMMON_OPTION_DEFAULTS = Object.freeze({
  quality: CONVERSION_DEFAULTS.quality,
  lossless: CONVERSION_DEFAULTS.lossless,
  effort: CONVERSION_DEFAULTS.effort,
  fps: CONVERSION_DEFAULTS.fps,
  loop: CONVERSION_DEFAULTS.loop,
  resizeMode: CONVERSION_DEFAULTS.resizeMode,
  scalePercent: CONVERSION_DEFAULTS.scalePercent,
  maxWidth: CONVERSION_DEFAULTS.maxWidth,
  maxHeight: CONVERSION_DEFAULTS.maxHeight,
  exactWidth: CONVERSION_DEFAULTS.exactWidth,
  exactHeight: CONVERSION_DEFAULTS.exactHeight,
});

const ANIMATED_OPTION_DEFAULTS = Object.freeze({
  frameDelayMode: CONVERSION_DEFAULTS.frameDelayMode,
  dropDuplicateFrames: CONVERSION_DEFAULTS.dropDuplicateFrames,
});

const VIDEO_OPTION_DEFAULTS = Object.freeze({
  trimStartSec: null,
  trimEndSec: null,
  maxDurationSec: null,
  maxFrames: null,
  scaleMode: VIDEO_SCALE_MODES.FIT,
});

const JPG_OPTION_DEFAULTS = Object.freeze({
  progressive: CONVERSION_DEFAULTS.progressive,
  chromaSubsampling: CONVERSION_DEFAULTS.chromaSubsampling,
  alphaBackground: CONVERSION_DEFAULTS.alphaBackground,
  stripMetadata: CONVERSION_DEFAULTS.stripMetadata,
});

const AVIF_OPTION_DEFAULTS = Object.freeze({
  chromaSubsampling: AVIF_CHROMA_SUBSAMPLING.AUTO,
  tune: AVIF_TUNES.AUTO,
  bitDepth: 8,
  alphaQuality: "auto",
});

const GIF_OPTION_DEFAULTS = Object.freeze({
  alphaMode: GIF_ALPHA_MODES.PRESERVE,
  alphaThreshold: 1,
  dither: GIF_DITHER_MODES.FLOYD,
});

export const SETTINGS_DEFAULTS = Object.freeze({
  commonOptions: COMMON_OPTION_DEFAULTS,
  animatedOptions: ANIMATED_OPTION_DEFAULTS,
  videoOptions: VIDEO_OPTION_DEFAULTS,
  jpgOptions: JPG_OPTION_DEFAULTS,
  avifOptions: AVIF_OPTION_DEFAULTS,
  gifOptions: GIF_OPTION_DEFAULTS,
});

export const SETTINGS_SECTIONS = Object.freeze({
  COMMON: "commonOptions",
  ANIMATED: "animatedOptions",
  VIDEO: "videoOptions",
  JPG: "jpgOptions",
  AVIF: "avifOptions",
  GIF: "gifOptions",
});

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

export function flattenSettingsToConversionOptions(settings) {
  const nextSettings = safeObject(settings);
  const commonOptions = safeObject(nextSettings.commonOptions);
  const animatedOptions = safeObject(nextSettings.animatedOptions);
  const videoOptions = safeObject(nextSettings.videoOptions);
  const jpgOptions = safeObject(nextSettings.jpgOptions);
  const avifOptions = safeObject(nextSettings.avifOptions);
  const gifOptions = safeObject(nextSettings.gifOptions);

  return {
    ...CONVERSION_DEFAULTS,
    ...commonOptions,
    ...animatedOptions,
    ...videoOptions,
    ...jpgOptions,
    avifOptions: {
      ...AVIF_OPTION_DEFAULTS,
      ...avifOptions,
    },
    gifOptions: {
      ...GIF_OPTION_DEFAULTS,
      ...gifOptions,
    },
  };
}
