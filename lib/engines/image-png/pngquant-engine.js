import { createEngineError, throwIfAborted } from "../common/errors";
import { ERROR_CODES } from "../../constants/error-codes";
import {
  mapEffortToPngquantSpeed,
  mapQualityToPngquantRange,
} from "./effort-map";

let wasmModulePromise = null;

function mapQualityToMaxColors(quality) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(quality) || 100)));
  if (normalized >= 100) {
    return 256;
  }

  // Keep palette floor at 16 to avoid severe posterization on photos.
  return Math.max(16, Math.round(16 + (normalized / 100) * 240));
}

async function getWasmModule() {
  if (!wasmModulePromise) {
    wasmModulePromise = import("libimagequant-wasm/wasm/libimagequant_wasm.js")
      .then(async (module) => {
        await module.default();
        return module;
      })
      .catch(() => {
        throw createEngineError(ERROR_CODES.PNGQUANT_LOAD_FAILED);
      });
  }

  return wasmModulePromise;
}

export async function quantizePngImageData({
  imageData,
  quality,
  effort,
  signal,
}) {
  throwIfAborted(signal);

  try {
    const wasmModule = await getWasmModule();
    throwIfAborted(signal);

    const quantizer = new wasmModule.ImageQuantizer();
    const qualityRange = mapQualityToPngquantRange(quality);
    let quantResult = null;

    try {
      quantizer.setSpeed(mapEffortToPngquantSpeed(effort));
      quantizer.setQuality(qualityRange.min, qualityRange.target);
      quantizer.setMaxColors(mapQualityToMaxColors(quality));

      quantResult = quantizer.quantizeImage(
        imageData.data,
        imageData.width,
        imageData.height
      );
      quantResult.setDithering(0.8);

      const remapped = quantResult.remapImage(
        imageData.data,
        imageData.width,
        imageData.height
      );

      if (!remapped) {
        throw createEngineError(ERROR_CODES.PNGQUANT_ENCODE_FAILED);
      }

      throwIfAborted(signal);
      return new ImageData(remapped, imageData.width, imageData.height);
    } finally {
      quantResult?.free?.();
      quantizer.free?.();
    }
  } catch (error) {
    if (error?.code === ERROR_CODES.USER_CANCELED) {
      throw error;
    }
    if (error?.code === ERROR_CODES.PNGQUANT_LOAD_FAILED) {
      throw error;
    }
    throw createEngineError(ERROR_CODES.PNGQUANT_ENCODE_FAILED);
  }
}
