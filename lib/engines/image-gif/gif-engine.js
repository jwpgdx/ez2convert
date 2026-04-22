import { ERROR_CODES } from "../../constants/error-codes";
import { createEngineError, throwIfAborted } from "../common/errors";
import {
  mapEffortToPngquantSpeed,
  mapQualityToPngquantRange,
} from "../image-png/effort-map";
import { GIF_ALPHA_MODES, GIF_DITHER_MODES } from "../../converters/constants";

let wasmModulePromise = null;
let gifencPromise = null;

function mapQualityToMaxColors(quality) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(quality) || 100)));
  if (normalized >= 100) {
    return 256;
  }

  // Keep palette floor at 16 to avoid severe posterization on photos.
  return Math.max(16, Math.round(16 + (normalized / 100) * 240));
}

function normalizeHexColor(value, fallback = "#FFFFFF") {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function parseHexRgb(hex) {
  const normalized = normalizeHexColor(hex);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function matteAlphaInPlace({
  rgba,
  alphaMode,
  alphaThreshold,
  background,
}) {
  const threshold = Math.max(0, Math.min(255, Math.floor(Number(alphaThreshold) || 1)));
  const { r: br, g: bg, b: bb } = background;

  for (let index = 0; index < rgba.length; index += 4) {
    const r = rgba[index];
    const g = rgba[index + 1];
    const b = rgba[index + 2];
    const a = rgba[index + 3];

    if (alphaMode === GIF_ALPHA_MODES.FLATTEN) {
      // Composite everything onto the background.
      const inv = 255 - a;
      rgba[index] = Math.round((r * a + br * inv) / 255);
      rgba[index + 1] = Math.round((g * a + bg * inv) / 255);
      rgba[index + 2] = Math.round((b * a + bb * inv) / 255);
      rgba[index + 3] = 255;
      continue;
    }

    // PRESERVE: keep pixels below threshold as fully transparent.
    if (a < threshold) {
      rgba[index] = br;
      rgba[index + 1] = bg;
      rgba[index + 2] = bb;
      rgba[index + 3] = 0;
      continue;
    }

    // Matte semi-transparent edges to avoid "black fringing" in 1-bit alpha output.
    if (a < 255) {
      const inv = 255 - a;
      rgba[index] = Math.round((r * a + br * inv) / 255);
      rgba[index + 1] = Math.round((g * a + bg * inv) / 255);
      rgba[index + 2] = Math.round((b * a + bb * inv) / 255);
      rgba[index + 3] = 255;
    }
  }
}

function mapDitherToLibImageQuantLevel(dither) {
  switch (dither) {
    case GIF_DITHER_MODES.NONE:
      return 0.0;
    case GIF_DITHER_MODES.BAYER:
      return 0.55;
    case GIF_DITHER_MODES.FLOYD:
    default:
      return 0.8;
  }
}

async function getWasmModule() {
  if (!wasmModulePromise) {
    wasmModulePromise = import("libimagequant-wasm/wasm/libimagequant_wasm.js")
      .then(async (module) => {
        await module.default();
        return module;
      })
      .catch(() => {
        throw createEngineError(ERROR_CODES.GIF_LOAD_FAILED);
      });
  }

  return wasmModulePromise;
}

async function getGifenc() {
  if (!gifencPromise) {
    gifencPromise = import("gifenc")
      .then((module) => module)
      .catch(() => {
        throw createEngineError(ERROR_CODES.GIF_LOAD_FAILED);
      });
  }

  return gifencPromise;
}

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

export async function encodeGifImageData({ imageData, options, signal }) {
  throwIfAborted(signal);

  try {
    const wasmModule = await getWasmModule();
    const gifenc = await getGifenc();
    throwIfAborted(signal);

    const background = parseHexRgb(options.alphaBackground);
    const alphaMode =
      options?.gifOptions?.alphaMode === GIF_ALPHA_MODES.FLATTEN
        ? GIF_ALPHA_MODES.FLATTEN
        : GIF_ALPHA_MODES.PRESERVE;
    const alphaThreshold = options?.gifOptions?.alphaThreshold ?? 1;
    const dither = String(options?.gifOptions?.dither || GIF_DITHER_MODES.FLOYD);

    // Copy pixels so we don't mutate the original ImageData buffer.
    const rgba = new Uint8ClampedArray(imageData.data);
    matteAlphaInPlace({
      rgba,
      alphaMode,
      alphaThreshold,
      background,
    });

    const quantizer = new wasmModule.ImageQuantizer();
    const qualityRange = mapQualityToPngquantRange(options.quality);
    const maxColors = mapQualityToMaxColors(options.quality);
    let quantResult = null;

    try {
      quantizer.setSpeed(mapEffortToPngquantSpeed(options.effort));
      quantizer.setQuality(qualityRange.min, qualityRange.target);
      quantizer.setMaxColors(maxColors);

      quantResult = quantizer.quantizeImage(rgba, imageData.width, imageData.height);
      quantResult.setDithering(mapDitherToLibImageQuantLevel(dither));

      const palette = quantResult.getPalette();
      const paletteIndices = quantResult.getPaletteIndices(
        rgba,
        imageData.width,
        imageData.height
      );

      if (!palette || !paletteIndices) {
        throw createEngineError(ERROR_CODES.GIF_ENCODE_FAILED);
      }

      const paletteRgb = palette.map((entry) => [entry[0], entry[1], entry[2]]);

      let transparentIndex = -1;
      if (alphaMode === GIF_ALPHA_MODES.PRESERVE) {
        transparentIndex = palette.findIndex((entry) => (entry[3] ?? 255) === 0);
      }

      const gif = gifenc.GIFEncoder();
      gif.writeFrame(paletteIndices, imageData.width, imageData.height, {
        palette: paletteRgb,
        repeat: typeof options.loop === "number" ? options.loop : 0,
        transparent: transparentIndex >= 0,
        transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      });
      gif.finish();

      const outputBytes = gif.bytes();
      if (!outputBytes?.length || !isGifBytes(outputBytes)) {
        throw createEngineError(ERROR_CODES.GIF_ENCODE_FAILED);
      }

      return outputBytes;
    } finally {
      quantResult?.free?.();
      quantizer.free?.();
    }
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.GIF_LOAD_FAILED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.GIF_ENCODE_FAILED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.GIF_ENCODE_FAILED);
  }
}

