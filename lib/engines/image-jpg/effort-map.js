import { JPG_CHROMA_SUBSAMPLING } from "../../converters/constants";

function clampInteger(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function mapEffortToJpegEncodeOptions(effort) {
  const normalizedEffort = clampInteger(effort, 1, 6);

  return {
    optimize_coding: normalizedEffort >= 2,
    trellis_opt_zero: normalizedEffort >= 3,
    trellis_opt_table: normalizedEffort >= 4,
    trellis_multipass: normalizedEffort >= 5,
    trellis_loops: normalizedEffort >= 6 ? 2 : 1,
  };
}

export function mapChromaSubsamplingToJpegEncodeOptions(chromaSubsampling) {
  if (chromaSubsampling === JPG_CHROMA_SUBSAMPLING.CHROMA_444) {
    return {
      auto_subsample: false,
      chroma_subsample: 1,
    };
  }

  if (chromaSubsampling === JPG_CHROMA_SUBSAMPLING.CHROMA_420) {
    return {
      auto_subsample: false,
      chroma_subsample: 2,
    };
  }

  return {
    auto_subsample: true,
    chroma_subsample: 2,
  };
}
