/**
 * Core analyzer — chunking, TF-IDF, domain/user alignment, bell curve.
 */

const { tokenize, tokenizeRaw, countBpeTokens } = require('./tokenizer');
const { computeStats, percentiles, robustSpread, linearRegression, sampleCorrelation, movingAverage, zScores, round } = require('./stats');
const { readabilityScores, sentimentAnalysis, lexicalDiversity, shannonEntropy, ngramAnalysis, sentenceLengthStats, readingTime } = require('./nlp');
const { cosineSimilarity, chunkSimilarityMatrix, posTag, extractTopics } = require('./advanced');

// ── User signal patterns ──────────────────────────────────
const USER_PATTERNS = [
  /\byou\b/gi, /\byour\b/gi, /\byours\b/gi, /\byourself\b/gi,
  /\buser\b/gi, /\busers\b/gi, /\bclient\b/gi, /\bcustomer\b/gi,
  /\bplease\b/gi, /\bprefer\b/gi, /\bwant\b/gi, /\bneed\b/gi,
  /\bshould\b/gi, /\brequire\b/gi, /\brequirement\b/gi,
  /\bspecif(?:y|ic|ically)\b/gi, /\bcustom\b/gi,
  /\bpersonali[sz]e\b/gi, /\bconfigure\b/gi, /\bsetting\b/gi,
  /\brole\b/gi, /\bgoal\b/gi, /\btask\b/gi, /\bworkflow\b/gi,
  /\binstruct(?:ion|ions)?\b/gi, /\bdirect(?:ive|ly)?\b/gi,
];
const ROLE_TERMS = new Set(['ceo','cto','cfo','coo','vp','director','manager','lead','architect','engineer','developer','analyst','designer','admin','founder','owner']);

// ── Chunking ──────────────────────────────────────────────
function chunkText(text, chunkSize = 500) {
  if (!text || text.length === 0) return [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > chunkSize && current.length > 0) { chunks.push(current.trim()); current = ''; }
    current += sentence;
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

// ── TF-IDF ────────────────────────────────────────────────
function computeTermStats(chunks) {
  const N = chunks.length;
  if (N === 0) return { terms: {}, idf: {}, chunkTokenLists: [] };
  const df = {}, globalTf = {};
  const chunkTokenLists = chunks.map(chunk => {
    const tokens = tokenize(chunk);
    new Set(tokens).forEach(t => { df[t] = (df[t] || 0) + 1; });
    tokens.forEach(t => { globalTf[t] = (globalTf[t] || 0) + 1; });
    return tokens;
  });
  const idf = {};
  for (const [term, count] of Object.entries(df)) idf[term] = Math.log((N + 1) / (count + 1)) + 1;
  const termScores = {};
  for (const [term, tf] of Object.entries(globalTf)) termScores[term] = tf * (idf[term] || 1);
  const sorted = Object.entries(termScores).sort((a, b) => b[1] - a[1]);
  const topN = Math.min(Math.max(30, Math.floor(sorted.length * 0.1)), 200);
  const terms = {};
  for (let i = 0; i < topN && i < sorted.length; i++) terms[sorted[i][0]] = sorted[i][1];
  return { terms, idf, chunkTokenLists };
}

// ── Scoring ───────────────────────────────────────────────
function scoreDomainAlignment(chunkTokens, domainTerms) {
  if (chunkTokens.length === 0 || Object.keys(domainTerms).length === 0) return 0;
  const maxTermScore = Math.max(...Object.values(domainTerms));
  let matchWeight = 0;
  for (const token of chunkTokens) if (domainTerms[token]) matchWeight += domainTerms[token] / maxTermScore;
  return Math.min(1, matchWeight / chunkTokens.length * 3);
}

function scoreUserAlignment(chunkText) {
  if (!chunkText || chunkText.length === 0) return 0;
  let signals = 0;
  const words = chunkText.split(/\s+/).length;
  if (words === 0) return 0;
  for (const pattern of USER_PATTERNS) { const m = chunkText.match(pattern); if (m) signals += m.length; }
  const lowerTokens = tokenize(chunkText);
  for (const token of lowerTokens) if (ROLE_TERMS.has(token)) signals += 2;
  const namedEntities = chunkText.match(/(?<=[a-z]\s)[A-Z][a-z]{2,}/g);
  if (namedEntities) signals += namedEntities.length * 0.5;
  return Math.min(1, signals / words * 5);
}

function interpretBell(stats, type) {
  const { mean, stdDev } = stats;
  const label = type === 'domain' ? 'domain-aligned' : 'user-specific';
  const spread = stdDev < 0.08 ? 'very tight' : stdDev < 0.15 ? 'tight' : stdDev < 0.25 ? 'moderate' : 'wide (flat)';
  const alignment = mean > 0.6 ? 'strong' : mean > 0.35 ? 'moderate' : mean > 0.15 ? 'weak' : 'minimal';
  return {
    spread, alignment,
    narrative: `${spread} bell curve (σ=${stdDev}): ${alignment} ${label} content. `
      + (stdDev < 0.15 && mean > 0.4 ? `Content is consistently ${label}.`
        : stdDev > 0.2 ? `Content varies significantly in ${type} alignment.`
        : `Content shows some ${type} focus but not consistently.`),
  };
}

// ── Extract fixed domain terms from reference text ────────
function extractDomainTerms(referenceText, options = {}) {
  const chunks = chunkText(referenceText, options.chunkSize || 500);
  return computeTermStats(chunks).terms;
}

// ── Main analysis ─────────────────────────────────────────
function analyzeContext(text, options = {}) {
  const chunkSize = options.chunkSize || 500;
  const chunks = chunkText(text, chunkSize);
  let domainTerms, chunkTokenLists;
  if (options.fixedDomainTerms) {
    domainTerms = options.fixedDomainTerms;
    chunkTokenLists = chunks.map(c => tokenize(c));
  } else {
    const stats = computeTermStats(chunks);
    domainTerms = stats.terms;
    chunkTokenLists = stats.chunkTokenLists;
  }

  const domainScores = [], userScores = [], chunkDetails = [];
  for (let i = 0; i < chunks.length; i++) {
    const dScore = scoreDomainAlignment(chunkTokenLists[i], domainTerms);
    const uScore = scoreUserAlignment(chunks[i]);
    domainScores.push(dScore);
    userScores.push(uScore);
    chunkDetails.push({ index: i, text: chunks[i], length: chunks[i].length, tokenCount: chunkTokenLists[i].length, domainScore: round(dScore), userScore: round(uScore) });
  }

  const topDomainTerms = Object.entries(domainTerms).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([term, weight]) => ({ term, weight: round(weight) }));

  return {
    summary: { totalLength: text.length, chunkCount: chunks.length, chunkSize, topDomainTerms },
    domain: { stats: computeStats(domainScores), interpretation: interpretBell(computeStats(domainScores), 'domain') },
    user: { stats: computeStats(userScores), interpretation: interpretBell(computeStats(userScores), 'user') },
    chunks: chunkDetails,
  };
}

// ── Extended analysis ─────────────────────────────────────
function analyzeContextExtended(text, options = {}) {
  const base = analyzeContext(text, options);
  const allTokens = tokenize(text);
  const chunkTokenLists = base.chunks.map(c => tokenize(c.text));
  const domainScores = base.chunks.map(c => c.domainScore);
  const userScores = base.chunks.map(c => c.userScore);

  base.readability = readabilityScores(text);
  base.lexical = lexicalDiversity(allTokens);
  base.sentiment = sentimentAnalysis(text);
  base.entropy = shannonEntropy(allTokens);
  base.bigrams = ngramAnalysis(allTokens, 2, 10);
  base.trigrams = ngramAnalysis(allTokens, 3, 10);
  base.estimatedTokens = countBpeTokens(text);
  base.tokenMethod = require('./tokenizer').encode ? 'bpe-exact' : 'word-estimate';
  base.sentenceStats = sentenceLengthStats(text);
  base.chunkSimilarity = chunkSimilarityMatrix(chunkTokenLists);
  base.readingTime = readingTime(text);
  base.bpeTokenCount = countBpeTokens(text);
  base.pos = posTag(text);
  base.topics = extractTopics(text);

  base.domain.percentiles = percentiles(domainScores);
  base.user.percentiles = percentiles(userScores);
  base.domain.robustSpread = robustSpread(domainScores);
  base.user.robustSpread = robustSpread(userScores);
  base.domain.trend = linearRegression(domainScores);
  base.user.trend = linearRegression(userScores);
  base.domainUserCorrelation = sampleCorrelation(domainScores, userScores);
  base.domain.movingAvg = movingAverage(domainScores, 5);
  base.user.movingAvg = movingAverage(userScores, 5);

  const domainZ = zScores(domainScores), userZ = zScores(userScores);
  for (let i = 0; i < base.chunks.length; i++) {
    base.chunks[i].sentiment = sentimentAnalysis(base.chunks[i].text).score;
    base.chunks[i].entropy = shannonEntropy(chunkTokenLists[i]);
    base.chunks[i].lexicalDiversity = lexicalDiversity(chunkTokenLists[i]).typeTokenRatio;
    base.chunks[i].avgSimilarityToOthers = base.chunkSimilarity.perChunkAvg[i];
    base.chunks[i].domainZScore = domainZ[i];
    base.chunks[i].userZScore = userZ[i];
    base.chunks[i].bpeTokens = countBpeTokens(base.chunks[i].text);
  }

  return base;
}

module.exports = { analyzeContext, analyzeContextExtended, extractDomainTerms, chunkText };
