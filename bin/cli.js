#!/usr/bin/env node
/**
 * context-inspector CLI
 *
 * Usage:
 *   context-inspector <file>                     # domain alignment (default)
 *   context-inspector <file> --user               # user alignment
 *   context-inspector <file> --chunk-size 300     # custom chunk size
 *   context-inspector <file> --json               # full JSON output
 *   context-inspector <file> --verbose            # per-chunk breakdown
 *   context-inspector --mcp                       # start MCP server
 *   context-inspector --serve                     # start web dashboard
 *   cat file.txt | context-inspector -            # read from stdin
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { file: null, concentrator: 'domain', chunkSize: 500, json: false, verbose: false, mcp: false, serve: false, setup: false };
  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--user') args.concentrator = 'user';
    else if (arg === '--domain') args.concentrator = 'domain';
    else if (arg === '--chunk-size' && argv[i + 1]) args.chunkSize = parseInt(argv[++i]);
    else if (arg === '--json') args.json = true;
    else if (arg === '--verbose' || arg === '-v') args.verbose = true;
    else if (arg === '--mcp') args.mcp = true;
    else if (arg === '--serve') args.serve = true;
    else if (arg === '--setup') args.setup = true;
    else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    else if (!args.file) args.file = arg;
    i++;
  }
  return args;
}

function printHelp() {
  console.log(`
context-inspector — Statistical early warning for AI context degradation

Usage:
  context-inspector <file> [options]     Analyze a file
  context-inspector - [options]          Read from stdin
  context-inspector --mcp               Start MCP server (stdio transport)
  context-inspector --serve              Start web dashboard (port 4000)
  context-inspector --setup              AI-guided setup wizard (port 4002)

Analysis options:
  --domain           Analyze domain alignment (default)
  --user             Analyze user-specific alignment
  --chunk-size N     Chunk size in characters (default: 500)
  --json             Output full analysis as JSON
  --verbose, -v      Show per-chunk breakdown
  --help, -h         Show this help

MCP tools (when running as --mcp):
  analyze_context    Full analysis with stats and bell curve data
  get_bell_curve     Quick bell curve summary
  get_chunks         Per-chunk alignment scores
  compare_alignment  Domain vs user side-by-side

Examples:
  context-inspector conversation.txt
  context-inspector prompt.md --user --chunk-size 300 --verbose
  context-inspector system.txt --json | jq '.domain.stats'
  echo "some text" | context-inspector -
  `);
}

function printBar(value, maxWidth = 30) {
  const filled = Math.round(value * maxWidth);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(maxWidth - filled);
}

function main() {
  const args = parseArgs(process.argv);

  // MCP mode
  if (args.mcp) {
    require(path.join(__dirname, '..', 'src', 'mcp-server.js'));
    return;
  }

  // Web dashboard mode
  if (args.serve) {
    require(path.join(__dirname, '..', 'src', 'server.js'));
    return;
  }

  // Setup wizard mode
  if (args.setup) {
    require(path.join(__dirname, '..', 'src', 'setup-wizard.js'));
    return;
  }

  // Analysis mode
  if (!args.file) { printHelp(); process.exit(1); }

  const text = args.file === '-'
    ? fs.readFileSync('/dev/stdin', 'utf-8')
    : fs.readFileSync(args.file, 'utf-8');

  const { analyze } = require(path.join(__dirname, '..', 'src', 'index.js'));
  const result = analyze(text, { chunkSize: args.chunkSize });

  if (args.json) { console.log(JSON.stringify(result, null, 2)); return; }

  const side = args.concentrator === 'user' ? result.user : result.domain;
  const stats = side.stats;
  const interp = side.interpretation;

  console.log(`\n  context-inspector — ${args.concentrator} alignment\n`);
  console.log(`  Input:       ${text.length.toLocaleString()} chars, ${result.summary.chunkCount} chunks @ ${args.chunkSize} chars`);
  console.log(`  Mean:        ${stats.mean.toFixed(4)}`);
  console.log(`  Std Dev:     ${stats.stdDev.toFixed(4)}  [${interp.spread}]`);
  console.log(`  Median:      ${stats.median.toFixed(4)}`);
  console.log(`  Skewness:    ${stats.skewness.toFixed(4)}`);
  console.log(`  Kurtosis:    ${stats.kurtosis.toFixed(4)}`);
  console.log(`  Range:       ${stats.min.toFixed(4)} — ${stats.max.toFixed(4)}`);
  console.log(`  Alignment:   ${interp.alignment}`);
  console.log(`  Narrative:   ${interp.narrative}`);

  console.log(`\n  Distribution (${args.concentrator}):\n`);
  const maxDensity = Math.max(...stats.histogram);
  for (let i = 0; i < stats.histogram.length; i++) {
    const lo = (i / stats.histogram.length).toFixed(2);
    const barLen = maxDensity > 0 ? Math.round((stats.histogram[i] / maxDensity) * 40) : 0;
    console.log(`  ${lo} |${'#'.repeat(barLen)}`);
  }
  console.log(`  1.00`);

  if (args.concentrator === 'domain') {
    console.log(`\n  Top domain terms:`);
    for (const { term, weight } of result.summary.topDomainTerms.slice(0, 10)) {
      console.log(`    ${term.padEnd(20)} ${weight.toFixed(2)}`);
    }
  }

  if (args.verbose) {
    console.log(`\n  Per-chunk breakdown:\n`);
    console.log(`  ${'#'.padEnd(4)} ${'Score'.padEnd(8)} ${'Bar'.padEnd(32)} Preview`);
    console.log(`  ${'─'.repeat(80)}`);
    for (const chunk of result.chunks) {
      const score = args.concentrator === 'user' ? chunk.userScore : chunk.domainScore;
      const preview = chunk.text.slice(0, 50).replace(/\n/g, ' ');
      console.log(`  ${String(chunk.index).padEnd(4)} ${score.toFixed(4).padEnd(8)} ${printBar(score)} ${preview}...`);
    }
  }

  console.log('');
}

main();
