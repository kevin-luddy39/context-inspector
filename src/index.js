/**
 * Context Inspector — Public API
 *
 * const { analyze, analyzeExtended, extractDomainTerms } = require('context-inspector');
 */

const { analyzeContext, analyzeContextExtended, extractDomainTerms } = require('./core/analyzer');
const { computeStats, percentiles, robustSpread, zScores, linearRegression, sampleCorrelation, movingAverage } = require('./core/stats');
const { tokenize, porterStem, applyNegation, countBpeTokens } = require('./core/tokenizer');
const { readabilityScores, sentimentAnalysis, lexicalDiversity, shannonEntropy, ngramAnalysis, sentenceLengthStats, readingTime } = require('./core/nlp');
const { cosineSimilarity, chunkSimilarityMatrix, posTag, extractTopics } = require('./core/advanced');

module.exports = {
  // Primary API
  analyze: analyzeContext,
  analyzeExtended: analyzeContextExtended,
  extractDomainTerms,

  // Statistics
  computeStats,
  percentiles,
  robustSpread,
  zScores,
  linearRegression,
  sampleCorrelation,
  movingAverage,

  // Tokenization
  tokenize,
  porterStem,
  applyNegation,
  countBpeTokens,

  // NLP
  readabilityScores,
  sentimentAnalysis,
  lexicalDiversity,
  shannonEntropy,
  ngramAnalysis,
  sentenceLengthStats,
  readingTime,

  // Advanced
  cosineSimilarity,
  chunkSimilarityMatrix,
  posTag,
  extractTopics,
};
