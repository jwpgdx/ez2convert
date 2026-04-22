function clampInteger(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function mapEffortToOxipngLevel(effort) {
  return clampInteger(effort, 1, 6);
}

export function mapEffortToPngquantSpeed(effort) {
  const normalizedEffort = clampInteger(effort, 1, 6);
  const speedByEffort = [10, 8, 6, 4, 2, 1];
  return speedByEffort[normalizedEffort - 1];
}

export function mapQualityToPngquantRange(quality) {
  const target = clampInteger(quality, 0, 100);
  const min = Math.max(0, target - 15);

  return {
    min,
    target,
  };
}

export function shouldRunPngquant({ lossless, quality }) {
  return !Boolean(lossless) && clampInteger(quality, 0, 100) < 100;
}
