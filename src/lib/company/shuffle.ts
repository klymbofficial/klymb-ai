/**
 * Random question shuffling (0099). Each candidate gets their own order,
 * worked out from their attempt id, so it stays the same on every reload and
 * device and nothing new is stored. Answers are still saved by question
 * number and original option index, so marking never sees the order.
 */

/** A small seeded generator (mulberry32) from a string. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The positions 0..n-1 in this seed's order (Fisher–Yates). */
export function seededOrder(n: number, seed: string): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  const rand = seeded(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The questions in this attempt's order. Questions stay within their
 * section, and sections keep their place, so a test built in parts still
 * reads in parts. Each multiple-choice question also gets `order`: its
 * options' original indexes in the order to show them.
 */
export function shuffleForAttempt<Q extends { no: number; section?: string | null; options?: string[] | null }>(questions: Q[], attemptId: string): (Q & { order?: number[] })[] {
  const sections: { key: string; items: Q[] }[] = [];
  for (const q of questions) {
    const key = q.section ?? "";
    const last = sections[sections.length - 1];
    if (last && last.key === key) last.items.push(q);
    else sections.push({ key, items: [q] });
  }
  return sections.flatMap((s, si) =>
    seededOrder(s.items.length, `${attemptId}:s${si}`).map((i) => {
      const q = s.items[i];
      return q.options && q.options.length > 1 ? { ...q, order: seededOrder(q.options.length, `${attemptId}:q${q.no}`) } : q;
    }),
  );
}
