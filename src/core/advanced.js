/**
 * Advanced NLP — cosine similarity, POS tagging, topic modeling.
 * These features gracefully degrade if optional deps aren't installed.
 */

const { round } = require('./stats');
const { tokenizeRaw } = require('./tokenizer');

let nlp, lda;
try { nlp = require('compromise'); } catch { nlp = null; }
try { lda = require('lda'); } catch { lda = null; }

// ── Cosine Similarity ─────────────────────────────────────
function cosineSimilarity(tokensA, tokensB) {
  const freqA = {}, freqB = {};
  tokensA.forEach(t => { freqA[t] = (freqA[t] || 0) + 1; });
  tokensB.forEach(t => { freqB[t] = (freqB[t] || 0) + 1; });
  const allTerms = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const t of allTerms) { const a = freqA[t] || 0, b = freqB[t] || 0; dot += a * b; magA += a * a; magB += b * b; }
  return (magA && magB) ? round(dot / (Math.sqrt(magA) * Math.sqrt(magB))) : 0;
}

function chunkSimilarityMatrix(chunkTokenLists) {
  const n = chunkTokenLists.length;
  const avgSimilarity = [];
  let totalSim = 0, count = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) { const sim = cosineSimilarity(chunkTokenLists[i], chunkTokenLists[j]); rowSum += sim; totalSim += sim; count++; }
    }
    avgSimilarity.push(round(n > 1 ? rowSum / (n - 1) : 0));
  }
  return { perChunkAvg: avgSimilarity, globalAvg: round(count > 0 ? totalSim / count : 0) };
}

// ── POS Tagging (compromise) ──────────────────────────────
function posTag(text) {
  if (!nlp) return null;
  const doc = nlp(text);
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().out('array');
  const adjectives = doc.adjectives().out('array');
  const adverbs = doc.adverbs().out('array');
  const total = text.split(/\s+/).length || 1;
  return {
    nouns: nouns.length, verbs: verbs.length, adjectives: adjectives.length, adverbs: adverbs.length,
    contentWordRatio: round((nouns.length + verbs.length + adjectives.length + adverbs.length) / total),
    entities: { people: nlp(text).people().out('array').slice(0, 10), places: nlp(text).places().out('array').slice(0, 10), organizations: nlp(text).organizations().out('array').slice(0, 10) },
    topNouns: nouns.slice(0, 15),
  };
}

// ── Topic Modeling (LDA) ──────────────────────────────────
function extractTopics(text, numTopics = 5, termsPerTopic = 8) {
  if (!lda) return null;
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  if (sentences.length < 3) return null;
  try {
    const topics = lda(sentences, numTopics, termsPerTopic);
    return topics.map((terms, i) => ({ id: i, terms: terms.map(t => ({ term: t.term, probability: round(t.probability) })) })).filter(t => t.terms.length > 0);
  } catch { return null; }
}

module.exports = { cosineSimilarity, chunkSimilarityMatrix, posTag, extractTopics };
