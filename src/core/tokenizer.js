/**
 * Tokenization — stemming, negation, stopwords, BPE counting.
 */

// ── Optional: gpt-tokenizer ──────────────────────────────
let encode;
try { encode = require('gpt-tokenizer').encode; } catch { encode = null; }

// ── Porter Stemmer ────────────────────────────────────────
const STEP2 = {ational:'ate',tional:'tion',enci:'ence',anci:'ance',izer:'ize',abli:'able',alli:'al',entli:'ent',eli:'e',ousli:'ous',ization:'ize',ation:'ate',ator:'ate',alism:'al',iveness:'ive',fulness:'ful',ousness:'ous',aliti:'al',iviti:'ive',biliti:'ble'};
const STEP3 = {icate:'ic',ative:'',alize:'al',iciti:'ic',ical:'ic',ful:'',ness:''};

function porterStem(w) {
  if (w.length < 3) return w;
  if (w.endsWith('sses')) w = w.slice(0,-2);
  else if (w.endsWith('ies')) w = w.slice(0,-2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0,-1);
  const m1b = /^(.+?)(eed|ed|ing)$/.exec(w);
  if (m1b) {
    const stem = m1b[1], suf = m1b[2];
    if (suf === 'eed') { if (/[aeiouy][^aeiouy]/.test(stem)) w = stem + 'ee'; }
    else if (/[aeiouy]/.test(stem)) {
      w = stem;
      if (/at$|bl$|iz$/.test(w)) w += 'e';
      else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0,-1);
      else if (/^[^aeiouy]*[aeiouy][^aeiouywxyz]$/.test(w)) w += 'e';
    }
  }
  if (/[aeiouy].+y$/.test(w)) w = w.slice(0,-1) + 'i';
  for (const [suf, rep] of Object.entries(STEP2)) {
    if (w.endsWith(suf)) { const s = w.slice(0,-suf.length); if (/[aeiouy][^aeiouy]/.test(s)) w = s + rep; break; }
  }
  for (const [suf, rep] of Object.entries(STEP3)) {
    if (w.endsWith(suf)) { const s = w.slice(0,-suf.length); if (/[aeiouy][^aeiouy]/.test(s)) w = s + rep; break; }
  }
  const m4 = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ion|ou|ism|ate|iti|ous|ive|ize)$/.exec(w);
  if (m4) { const s = m4[1]; if (/[aeiouy][^aeiouy].*[aeiouy][^aeiouy]/.test(s)) w = s; }
  if (w.endsWith('e')) { const s = w.slice(0,-1); if (/[aeiouy][^aeiouy].*[aeiouy][^aeiouy]/.test(s) || (/[aeiouy][^aeiouy]/.test(s) && !/[^aeiouy][aeiouy][^aeiouywxyz]$/.test(s))) w = s; }
  if (/ll$/.test(w) && /[aeiouy][^aeiouy].*[aeiouy][^aeiouy]/.test(w)) w = w.slice(0,-1);
  return w;
}

// ── Negation ──────────────────────────────────────────────
const NEGATION_WORDS = new Set(['not','no','never','neither','nor','nobody','nothing','nowhere','hardly','scarcely','barely','cannot','cant','dont','doesnt','didnt','wont','wouldnt','shouldnt','couldnt','isnt','arent','wasnt','werent','hasnt','havent','hadnt']);

function applyNegation(tokens, windowSize = 3) {
  const result = [];
  let scope = 0;
  for (const t of tokens) {
    if (NEGATION_WORDS.has(t.replace(/'/g, ''))) { scope = windowSize; continue; }
    if (scope > 0) { result.push('NOT_' + t); scope--; }
    else result.push(t);
  }
  return result;
}

// ── Stopwords ─────────────────────────────────────────────
const STOPWORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are',
  'aren','as','at','be','because','been','before','being','below','between','both',
  'but','by','can','could','d','did','didn','do','does','doesn','doing','don','down',
  'during','each','few','for','from','further','get','got','had','hadn','has','hasn',
  'have','haven','having','he','her','here','hers','herself','him','himself','his',
  'how','i','if','in','into','is','isn','it','its','itself','just','ll','m','ma',
  'me','might','more','most','must','mustn','my','myself','need','no','nor','not',
  'now','o','of','off','on','once','only','or','other','our','ours','ourselves','out',
  'over','own','re','s','same','shall','shan','she','should','shouldn','so','some',
  'such','t','than','that','the','their','theirs','them','themselves','then','there',
  'these','they','this','those','through','to','too','under','until','up','ve','very',
  'was','wasn','we','were','weren','what','when','where','which','while','who','whom',
  'why','will','with','won','would','wouldn','y','you','your','yours','yourself',
  'yourselves','also','well','like','use','used','using','one','two','three','new',
  'way','may','even','much','many','make','see','come','take','still','know','back',
  'first','last','long','great','little','right','old','big','high','different','small',
  'next','put','end','thing','things','work','part','case','point','think','try',
]);

// ── Tokenize ──────────────────────────────────────────────
function tokenizeRaw(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function tokenize(text, options = {}) {
  let tokens = tokenizeRaw(text);
  if (options.negation !== false) tokens = applyNegation(tokens);
  if (options.stem !== false) tokens = tokens.map(t => t.startsWith('NOT_') ? 'NOT_' + porterStem(t.slice(4)) : porterStem(t));
  return tokens;
}

// ── BPE Token Count ───────────────────────────────────────
function countBpeTokens(text) {
  if (encode) { try { return encode(text).length; } catch { /* fallback */ } }
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

module.exports = { tokenize, tokenizeRaw, porterStem, applyNegation, countBpeTokens, STOPWORDS };
