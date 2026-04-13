/**
 * NLP functions — readability, sentiment, entropy, n-grams, etc.
 */

const { round } = require('./stats');

// ── Readability ───────────────────────────────────────────
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function readabilityScores(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const chars = words.join('').length;
  const W = words.length || 1, S = sentences.length || 1;
  return {
    fleschKincaidGrade: round(0.39 * (W / S) + 11.8 * (syllables / W) - 15.59),
    fleschReadingEase: round(206.835 - 1.015 * (W / S) - 84.6 * (syllables / W)),
    colemanLiau: round(0.0588 * (chars / W * 100) - 0.296 * (S / W * 100) - 15.8),
    automatedReadabilityIndex: round(4.71 * (chars / W) + 0.5 * (W / S) - 21.43),
    avgSentenceLength: round(W / S),
    avgSyllablesPerWord: round(syllables / W),
    sentenceCount: S, wordCount: W,
  };
}

// ── Sentiment ─────────────────────────────────────────────
const POS_WORDS = new Set(['good','great','excellent','best','better','improve','improved','success','successful','effective','efficient','fast','reliable','secure','safe','clean','clear','easy','simple','perfect','optimal','correct','accurate','robust','powerful','strong','innovative']);
const NEG_WORDS = new Set(['bad','worst','worse','fail','failed','failure','error','errors','wrong','broken','slow','expensive','complex','complicated','difficult','hard','insecure','unsafe','unreliable','fragile','buggy','degraded','corrupt','corrupted','missing','lost','silent','misroute']);

function sentimentAnalysis(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let pos = 0, neg = 0;
  words.forEach(w => { if (POS_WORDS.has(w)) pos++; if (NEG_WORDS.has(w)) neg++; });
  const total = pos + neg || 1;
  return { positive: pos, negative: neg, score: round((pos - neg) / (words.length || 1)), ratio: round(pos / total), label: pos > neg * 1.5 ? 'positive' : neg > pos * 1.5 ? 'negative' : 'neutral' };
}

// ── Lexical Diversity ─────────────────────────────────────
function lexicalDiversity(tokens) {
  if (tokens.length === 0) return { typeTokenRatio: 0, hapaxRatio: 0, uniqueTokens: 0, totalTokens: 0 };
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const types = Object.keys(freq).length;
  const hapax = Object.values(freq).filter(c => c === 1).length;
  return { typeTokenRatio: round(types / tokens.length), hapaxRatio: round(hapax / types || 0), uniqueTokens: types, totalTokens: tokens.length };
}

// ── Entropy ───────────────────────────────────────────────
function shannonEntropy(tokens) {
  if (tokens.length === 0) return 0;
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const n = tokens.length;
  let entropy = 0;
  for (const count of Object.values(freq)) { const p = count / n; if (p > 0) entropy -= p * Math.log2(p); }
  return round(entropy);
}

// ── N-grams ───────────────────────────────────────────────
function ngramAnalysis(tokens, n = 2, topK = 10) {
  if (tokens.length < n) return [];
  const grams = {};
  for (let i = 0; i <= tokens.length - n; i++) { const g = tokens.slice(i, i + n).join(' '); grams[g] = (grams[g] || 0) + 1; }
  return Object.entries(grams).sort((a, b) => b[1] - a[1]).slice(0, topK).map(([gram, count]) => ({ gram, count }));
}

// ── Sentence Stats ────────────────────────────────────────
function sentenceLengthStats(text) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [];
  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  if (lengths.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length);
  return { mean: round(mean), stdDev: round(stdDev), min: Math.min(...lengths), max: Math.max(...lengths), count: lengths.length };
}

// ── Reading Time ──────────────────────────────────────────
function readingTime(text, wpm = 250) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = words / wpm;
  return { minutes: round(minutes), seconds: Math.round(minutes * 60), words };
}

module.exports = { readabilityScores, sentimentAnalysis, lexicalDiversity, shannonEntropy, ngramAnalysis, sentenceLengthStats, readingTime };
