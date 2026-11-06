/**
 * Linear algebra utilities for the recommendation engine.
 * All vectors are number[] (serialized Float32Array).
 */

/** Dot product of two equal-length vectors */
export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** L2 norm */
export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/** Cosine similarity — returns 0 if either vector is zero */
export function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/** Normalize a vector to unit length */
export function normalize(v: number[]): number[] {
  const n = norm(v);
  if (n === 0) return v.slice();
  return v.map((x) => x / n);
}

/**
 * Momentum-weighted moving average update for interest vectors.
 * momentum ∈ [0, 1] — higher = stronger pull toward article embedding.
 */
export function momentumUpdate(
  current: number[],
  article: number[],
  momentum: number
): number[] {
  const m = Math.min(1, Math.max(0, momentum));
  const updated = current.map(
    (c, i) => (1 - m) * c + m * (article[i] ?? 0)
  );
  return normalize(updated);
}

/** Recency decay: e^(-λ × hours) where λ ≈ 0.01 */
export function recencyDecay(publishedAt: number, lambda = 0.01): number {
  const hours = (Date.now() - publishedAt) / (1000 * 60 * 60);
  return Math.exp(-lambda * hours);
}
