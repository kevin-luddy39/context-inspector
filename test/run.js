#!/usr/bin/env node
/**
 * Basic test suite for context-inspector.
 */

const { analyze, analyzeExtended, extractDomainTerms, tokenize, porterStem, computeStats, readabilityScores, sentimentAnalysis } = require('../src/index');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed');
}

console.log('\ncontext-inspector tests\n');

// ── Tokenizer ──────────────────────────────────────────
test('tokenize returns array of stemmed tokens', () => {
  const tokens = tokenize('The quick brown foxes are jumping over lazy dogs');
  assert(Array.isArray(tokens));
  assert(tokens.length > 0);
  assert(!tokens.includes('the')); // stopword removed
});

test('porterStem reduces words', () => {
  assert(porterStem('running') === 'run');
  assert(porterStem('analysis').length < 'analysis'.length);
});

test('tokenize handles negation', () => {
  // "not" is a stopword, but "never" and "cannot" are negation words
  const tokens = tokenize('The system never produces correct results');
  assert(tokens.some(t => t.startsWith('NOT_')), 'should have negated tokens after "never"');
});

// ── Stats ──────────────────────────────────────────────
test('computeStats returns correct structure', () => {
  const stats = computeStats([0.1, 0.3, 0.5, 0.7, 0.9]);
  assert(stats.mean === 0.5);
  assert(stats.stdDev > 0);
  assert(stats.count === 5);
  assert(stats.histogram.length === 20);
  assert(stats.gaussianFit.length === 20);
});

test('computeStats handles empty array', () => {
  const stats = computeStats([]);
  assert(stats.mean === 0);
  assert(stats.count === 0);
});

// ── Analyzer ───────────────────────────────────────────
test('analyze returns domain and user stats', () => {
  const result = analyze('The quick brown fox jumped over the lazy dog. The fox was very quick and brown.');
  assert(result.domain);
  assert(result.user);
  assert(result.summary);
  assert(result.chunks.length > 0);
  assert(typeof result.domain.stats.mean === 'number');
  assert(typeof result.domain.stats.stdDev === 'number');
});

test('analyze with fixedDomainTerms works', () => {
  const ref = 'Pigs built houses from straw, sticks, and bricks. The wolf huffed and puffed.';
  const terms = extractDomainTerms(ref);
  assert(Object.keys(terms).length > 0);

  const onDomain = analyze('The pig built a house of bricks and the wolf could not blow it down.', { fixedDomainTerms: terms });
  const offDomain = analyze('Christopher Columbus sailed across the Atlantic Ocean in 1492.', { fixedDomainTerms: terms });

  assert(onDomain.domain.stats.mean > offDomain.domain.stats.mean, 'on-domain should score higher than off-domain');
});

test('analyze with custom chunkSize', () => {
  const text = 'The quick fox jumped. '.repeat(100);
  const r1 = analyze(text, { chunkSize: 100 });
  const r2 = analyze(text, { chunkSize: 2000 });
  assert(r1.summary.chunkCount >= r2.summary.chunkCount, `expected ${r1.summary.chunkCount} >= ${r2.summary.chunkCount}`);
});

// ── NLP ────────────────────────────────────────────────
test('readabilityScores returns metrics', () => {
  const r = readabilityScores('This is a simple sentence. It has two sentences.');
  assert(typeof r.fleschKincaidGrade === 'number');
  assert(typeof r.fleschReadingEase === 'number');
  assert(r.sentenceCount === 2);
});

test('sentimentAnalysis scores text', () => {
  const pos = sentimentAnalysis('This is great, excellent, and successful.');
  const neg = sentimentAnalysis('This is bad, broken, and a failure.');
  assert(pos.score > neg.score, 'positive text should score higher');
});

// ── Extended ───────────────────────────────────────────
test('analyzeExtended includes all features', () => {
  const r = analyzeExtended('The fox built a house. The wolf blew it down. The pig was safe inside the brick house.');
  assert(r.readability);
  assert(r.lexical);
  assert(r.sentiment);
  assert(typeof r.entropy === 'number');
  assert(r.bigrams.length > 0);
  assert(typeof r.bpeTokenCount === 'number');
  assert(r.domain.percentiles);
  assert(r.domain.robustSpread);
  assert(r.domain.trend);
  assert(r.domain.movingAvg);
  assert(r.readingTime);
});

// ── Summary ────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
