/**
 * A stable shuffle of 0..n-1 seeded by a string (a question id): the same
 * question shows its options in the same order on every visit and in both
 * languages, but the best answer isn't always first. Answers are stored as
 * original indexes, so scores never depend on the display order.
 */
export function shuffledOrder(seed: string, n: number): number[] {
  // The "c" salt was picked because it spreads the best answers of the current days across A–D.
  const key = `c${seed}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
