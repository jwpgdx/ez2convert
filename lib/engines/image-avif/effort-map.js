const EFFORT_TO_SPEED = Object.freeze({
  1: 10,
  2: 8,
  3: 6,
  4: 4,
  5: 2,
  6: 0,
});

export function mapEffortToAvifSpeed(effort) {
  const numeric = Number(effort);
  if (!Number.isFinite(numeric)) {
    return EFFORT_TO_SPEED[4];
  }

  const clamped = Math.round(Math.max(1, Math.min(6, numeric)));
  return EFFORT_TO_SPEED[clamped] ?? EFFORT_TO_SPEED[4];
}

