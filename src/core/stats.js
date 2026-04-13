/**
 * Statistical functions — distributions, regression, robust measures.
 */

function round(v, d = 4) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

function computeStats(scores) {
  const n = scores.length;
  if (n === 0) return { mean: 0, stdDev: 0, skewness: 0, kurtosis: 0, min: 0, max: 0, median: 0, count: 0, histogram: [], gaussianFit: [], binEdges: [] };

  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const m3 = scores.reduce((s, v) => s + ((v - mean) / (stdDev || 1)) ** 3, 0) / n;
  const m4 = scores.reduce((s, v) => s + ((v - mean) / (stdDev || 1)) ** 4, 0) / n - 3;

  const sorted = [...scores].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const binCount = 20;
  const histogram = Array(binCount).fill(0);
  for (const s of scores) histogram[Math.min(binCount - 1, Math.floor(s * binCount))]++;
  const binWidth = 1 / binCount;
  const histDensity = histogram.map(c => c / (n * binWidth));

  const gaussianFit = [];
  for (let i = 0; i < binCount; i++) {
    const x = (i + 0.5) / binCount;
    gaussianFit.push(stdDev > 0
      ? (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2)
      : 0);
  }

  return {
    mean: round(mean), stdDev: round(stdDev), variance: round(variance),
    skewness: round(m3), kurtosis: round(m4),
    min: round(Math.min(...scores)), max: round(Math.max(...scores)),
    median: round(median), count: n,
    histogram: histDensity.map(round), gaussianFit: gaussianFit.map(round),
    binEdges: Array.from({ length: binCount }, (_, i) => round(i / binCount)),
  };
}

function percentiles(scores, ps = [10, 25, 50, 75, 90]) {
  if (scores.length === 0) return {};
  const sorted = [...scores].sort((a, b) => a - b);
  const result = {};
  for (const p of ps) {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    result['p' + p] = round(lo === Math.ceil(idx) ? sorted[lo] : sorted[lo] + (sorted[lo + 1] - sorted[lo]) * (idx - lo));
  }
  return result;
}

function robustSpread(scores) {
  if (scores.length === 0) return { iqr: 0, mad: 0, q1: 0, q3: 0 };
  const sorted = [...scores].sort((a, b) => a - b);
  const q = (p) => { const i = p * (sorted.length - 1); const lo = Math.floor(i); return lo === Math.ceil(i) ? sorted[lo] : sorted[lo] + (sorted[lo + 1] - sorted[lo]) * (i - lo); };
  const q1 = q(0.25), q3 = q(0.75), median = q(0.5);
  const deviations = scores.map(s => Math.abs(s - median)).sort((a, b) => a - b);
  const mad = deviations.length % 2 === 0 ? (deviations[deviations.length / 2 - 1] + deviations[deviations.length / 2]) / 2 : deviations[Math.floor(deviations.length / 2)];
  return { iqr: round(q3 - q1), mad: round(mad), q1: round(q1), q3: round(q3) };
}

function zScores(scores) {
  if (scores.length === 0) return [];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const std = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length) || 1;
  return scores.map(s => round((s - mean) / std));
}

function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, trend: 'flat' };
  const mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (ys[i] - my); den += (i - mx) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const predicted = Array.from({ length: n }, (_, i) => intercept + slope * i);
  const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return { slope: round(slope), intercept: round(intercept), rSquared: round(ssTot > 0 ? 1 - ssRes / ssTot : 0), trend: Math.abs(slope) < 0.001 ? 'flat' : slope > 0 ? 'increasing' : 'decreasing' };
}

function sampleCorrelation(xs, ys) {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const x = xs[i] - mx, y = ys[i] - my; num += x * y; dx += x * x; dy += y * y; }
  return (dx && dy) ? round(num / Math.sqrt(dx * dy)) : 0;
}

function movingAverage(values, window = 5) {
  if (values.length <= window) return values.map(round);
  return values.map((_, i) => {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(values.length, start + window);
    return round(values.slice(start, end).reduce((a, b) => a + b, 0) / (end - start));
  });
}

module.exports = { computeStats, percentiles, robustSpread, zScores, linearRegression, sampleCorrelation, movingAverage, round };
