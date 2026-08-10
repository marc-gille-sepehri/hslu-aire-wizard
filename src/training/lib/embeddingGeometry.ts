// Turning embedding distances into a picture — and being honest about what the
// picture loses.
//
// n points with arbitrary pairwise distances need up to n−1 dimensions. So:
//   2 points → exact in a line
//   3 points → ALWAYS exact in a plane (any three distances obeying the
//              triangle inequality form a triangle)
//   4 points → exact only if they happen to be coplanar in embedding space,
//              which they are not
//   5 points → would need 4 dimensions
//
// From four texts on, the plane is a projection. This module computes the best
// one (classical MDS) and — just as importantly — reports how much it lies.

/** Cosine similarity in [-1, 1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Angular distance, normalised to [0, 1]. Used instead of `1 − cos` because it
 * is a true metric: it obeys the triangle inequality, which is exactly the
 * property that makes three points drawable without any error at all.
 */
export function angularDistance(a: number[], b: number[]): number {
  const cos = Math.max(-1, Math.min(1, cosineSimilarity(a, b)))
  return Math.acos(cos) / Math.PI
}

export function distanceMatrix(vectors: number[][]): number[][] {
  const n = vectors.length
  const d = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = angularDistance(vectors[i], vectors[j])
      d[i][j] = v
      d[j][i] = v
    }
  }
  return d
}

export interface Layout {
  /** Coordinates in [0,1]² — the caller maps them onto the canvas. */
  points: { x: number; y: number }[]
  /**
   * The same layout before it was fitted into the unit square. Distance maths
   * must use these: `points` is uniformly rescaled for drawing, so comparing it
   * against true distances measures the scale factor, not the distortion.
   */
  raw: { x: number; y: number }[]
  /**
   * Kruskal stress-1 over the drawn vs. true distances, in [0, 1].
   * 0 means the drawing is exact. Below ~0.05 is a good picture.
   */
  stress: number
  /** True when the layout reproduces every distance exactly (n ≤ 3). */
  exact: boolean
}

/**
 * Classical multidimensional scaling: double-centre the squared distances, then
 * take the two leading eigenvectors. For n ≤ 12 the power iteration below is
 * instant and needs no dependency.
 */
export function layoutInPlane(d: number[][]): Layout {
  const n = d.length
  if (n === 0) return { points: [], raw: [], stress: 0, exact: true }
  if (n === 1) {
    return { points: [{ x: 0.5, y: 0.5 }], raw: [{ x: 0, y: 0 }], stress: 0, exact: true }
  }

  // B = -½ · J · D² · J   (J = centring matrix)
  const sq = d.map((row) => row.map((v) => v * v))
  const rowMean = sq.map((row) => row.reduce((a, b) => a + b, 0) / n)
  const grandMean = rowMean.reduce((a, b) => a + b, 0) / n
  const B = sq.map((row, i) => row.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + grandMean)))

  const [v1, l1] = leadingEigen(B, [])
  const [v2, l2] = leadingEigen(B, [v1])

  const s1 = Math.sqrt(Math.max(0, l1))
  const s2 = Math.sqrt(Math.max(0, l2))
  const raw = v1.map((_, i) => ({ x: v1[i] * s1, y: v2[i] * s2 }))

  return { points: normalise(raw), raw, stress: stressOf(d, raw), exact: n <= 3 }
}

const dot = (a: number[], b: number[]) => a.reduce((acc, x, i) => acc + x * b[i], 0)
const norm = (a: number[]) => Math.sqrt(dot(a, a))

/** Remove the components along `basis` (assumed orthonormal). */
function orthogonalise(v: number[], basis: number[][]): number[] {
  let out = v
  for (const b of basis) {
    const c = dot(out, b)
    out = out.map((x, i) => x - c * b[i])
  }
  return out
}

/**
 * Dominant eigenpair of a symmetric matrix, restricted to the subspace
 * orthogonal to `exclude`.
 *
 * Deflation is done by projecting out `exclude` on every step rather than by
 * subtracting λvvᵀ once, and several deterministic start vectors are tried.
 * Both matter for the degenerate case (two equal eigenvalues — a square, a
 * regular tetrahedron): there, `B·start` is by construction parallel to the
 * first eigenvector, so a single fixed start collapses to the zero vector and
 * silently reports a second eigenvalue of 0 — a plane that is genuinely exact
 * then gets drawn as a line and reported as ~50 % distorted.
 */
function leadingEigen(m: number[][], exclude: number[][]): [number[], number] {
  const n = m.length
  const seeds = [
    Array.from({ length: n }, (_, i) => Math.cos(i + 1) + 0.5),
    Array.from({ length: n }, (_, i) => Math.sin(2 * i + 1)),
    Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : -1) * (1 + i / n)),
    Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0)),
  ]

  for (const seed of seeds) {
    let v = orthogonalise(seed, exclude)
    const n0 = norm(v)
    if (n0 < 1e-9) continue
    v = v.map((x) => x / n0)

    let lambda = 0
    for (let iter = 0; iter < 512; iter++) {
      const next = orthogonalise(
        m.map((row) => dot(row, v)),
        exclude,
      )
      const nrm = norm(next)
      if (nrm < 1e-12) {
        lambda = 0
        break
      }
      const nv = next.map((x) => x / nrm)
      lambda = dot(nv, m.map((row) => dot(row, nv)))
      const delta = nv.reduce((acc, x, i) => acc + Math.abs(x - v[i]), 0)
      v = nv
      if (delta < 1e-12) break
    }
    if (lambda > 1e-12) return [v, lambda]
  }
  return [new Array(n).fill(0), 0]
}

/** Kruskal stress-1: how far the drawn distances are from the true ones. */
function stressOf(d: number[][], pts: { x: number; y: number }[]): number {
  let num = 0
  let den = 0
  for (let i = 0; i < d.length; i++) {
    for (let j = i + 1; j < d.length; j++) {
      const drawn = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
      num += (drawn - d[i][j]) ** 2
      den += d[i][j] ** 2
    }
  }
  return den === 0 ? 0 : Math.sqrt(num / den)
}

/** Fit into [0,1]² without distorting the aspect ratio — a stretched plot lies. */
function normalise(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length === 1) return [{ x: 0.5, y: 0.5 }]
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const offX = (span - (maxX - minX)) / 2
  const offY = (span - (maxY - minY)) / 2
  return pts.map((p) => ({ x: (p.x - minX + offX) / span, y: (p.y - minY + offY) / span }))
}

/**
 * Per-edge distortion, so the drawing can say where it lies rather than only
 * how much. Positive = drawn too long, negative = drawn too short.
 */
export function edgeDistortion(
  d: number[][],
  raw: { x: number; y: number }[],
  i: number,
  j: number,
): number {
  // `raw`, not the normalised drawing coordinates — those carry a uniform scale
  // factor that would show up as a constant fake distortion on every edge.
  const drawn = Math.hypot(raw[i].x - raw[j].x, raw[i].y - raw[j].y)
  return d[i][j] === 0 ? 0 : (drawn - d[i][j]) / d[i][j]
}
