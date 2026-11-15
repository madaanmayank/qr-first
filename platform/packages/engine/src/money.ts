/** Integer paise helpers. No floating point reaches a money value. */

/** Divide and round half away from zero. Both arguments are safe integers. */
export function roundDiv(n: number, d: number): number {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0) {
    throw new RangeError(`roundDiv needs safe integers and d > 0, got ${n} / ${d}`);
  }
  const magnitude = Math.floor((2 * Math.abs(n) + d) / (2 * d));
  // Never return negative zero.
  return magnitude === 0 ? 0 : n < 0 ? -magnitude : magnitude;
}

/** Nearest whole rupee in paise. 50 paise rounds up (docs/15 section 1). */
export function roundToRupee(paise: number): number {
  return roundDiv(paise, 100) * 100;
}

/**
 * Split `total` across `weights` in proportion, with no paise lost or invented
 * (largest remainder, ties to the earlier index). `total` and weights are non-negative integers.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum === 0) return weights.map(() => 0);
  const base = weights.map((w) => Math.floor((total * w) / sum));
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, rem: (total * w) % sum }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    base[i]! += 1;
    left -= 1;
  }
  return base;
}

/** Basis points from a percent that may have a decimal part (for example 2.5 gives 250). */
export function percentToBp(percent: number): number {
  return Math.round(percent * 100);
}
