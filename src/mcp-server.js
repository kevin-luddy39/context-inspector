#!/usr/bin/env node
/**
 * Context Inspector — MCP Server
 *
 * Exposes context analysis as MCP tools over stdio transport.
 * Add to .mcp.json or claude_desktop_config.json:
 *
 * {
 *   "mcpServers": {
 *     "context-inspector": {
 *       "command": "node",
 *       "args": ["/path/to/mcp-server.js"]
 *     }
 *   }
 * }
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { analyzeContext } = require('./core/analyzer');

const server = new McpServer({
  name: 'context-inspector',
  version: '1.0.0',
});

// Tool: Full context analysis
server.tool(
  'analyze_context',
  'Analyze text for domain and user alignment. Returns statistics, bell curve data, and per-chunk breakdown.',
  {
    text: z.string().describe('The context text to analyze'),
    chunkSize: z.number().optional().default(500).describe('Chunk size in characters (default 500)'),
    concentrator: z.enum(['domain', 'user']).optional().default('domain').describe('Alignment dimension to focus on'),
  },
  async ({ text, chunkSize, concentrator }) => {
    const result = analyzeContext(text, { chunkSize });
    const side = concentrator === 'user' ? result.user : result.domain;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: result.summary,
          concentrator,
          stats: side.stats,
          interpretation: side.interpretation,
          chunks: result.chunks.map(c => ({
            index: c.index,
            score: concentrator === 'user' ? c.userScore : c.domainScore,
            length: c.length,
            preview: c.text.slice(0, 100),
          })),
        }, null, 2),
      }],
    };
  }
);

// Tool: Quick bell curve summary
server.tool(
  'get_bell_curve',
  'Get the bell curve statistics (mean, std dev, histogram) for domain or user alignment of a text.',
  {
    text: z.string().describe('The context text to analyze'),
    concentrator: z.enum(['domain', 'user']).optional().default('domain').describe('domain or user'),
    chunkSize: z.number().optional().default(500).describe('Chunk size in characters'),
  },
  async ({ text, concentrator, chunkSize }) => {
    const result = analyzeContext(text, { chunkSize });
    const side = concentrator === 'user' ? result.user : result.domain;

    return {
      content: [{
        type: 'text',
        text: [
          `Bell Curve: ${concentrator} alignment`,
          `Mean:     ${side.stats.mean}`,
          `Std Dev:  ${side.stats.stdDev}  (${side.interpretation.spread})`,
          `Skewness: ${side.stats.skewness}`,
          `Kurtosis: ${side.stats.kurtosis}`,
          `Chunks:   ${side.stats.count}`,
          ``,
          side.interpretation.narrative,
        ].join('\n'),
      }],
    };
  }
);

// Tool: Chunk-level breakdown
server.tool(
  'get_chunks',
  'Get per-chunk alignment scores and text for a context. Useful for finding which parts of the context are most/least aligned.',
  {
    text: z.string().describe('The context text to analyze'),
    concentrator: z.enum(['domain', 'user']).optional().default('domain'),
    chunkSize: z.number().optional().default(500),
    topN: z.number().optional().default(5).describe('Return only the top N highest-scoring chunks (0 for all)'),
    bottomN: z.number().optional().default(5).describe('Also return the bottom N lowest-scoring chunks'),
  },
  async ({ text, concentrator, chunkSize, topN, bottomN }) => {
    const result = analyzeContext(text, { chunkSize });
    const scored = result.chunks.map(c => ({
      index: c.index,
      score: concentrator === 'user' ? c.userScore : c.domainScore,
      text: c.text,
    }));

    const sorted = [...scored].sort((a, b) => b.score - a.score);
    const top = topN > 0 ? sorted.slice(0, topN) : [];
    const bottom = bottomN > 0 ? sorted.slice(-bottomN) : [];

    const output = { total: scored.length, concentrator };
    if (topN > 0) output.highestScoring = top;
    if (bottomN > 0) output.lowestScoring = bottom;
    if (topN === 0 && bottomN === 0) output.all = scored;

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
    };
  }
);

// Tool: Statistical comparison
server.tool(
  'compare_alignment',
  'Compare domain vs user alignment for a context. Shows which dimension the content is more tightly aligned to.',
  {
    text: z.string().describe('The context text to analyze'),
    chunkSize: z.number().optional().default(500),
  },
  async ({ text, chunkSize }) => {
    const result = analyzeContext(text, { chunkSize });
    const d = result.domain;
    const u = result.user;

    const moreAligned = d.stats.mean > u.stats.mean ? 'domain' : 'user';
    const tighter = d.stats.stdDev < u.stats.stdDev ? 'domain' : 'user';

    return {
      content: [{
        type: 'text',
        text: [
          `Domain:  mean=${d.stats.mean}, σ=${d.stats.stdDev} (${d.interpretation.spread}, ${d.interpretation.alignment})`,
          `User:    mean=${u.stats.mean}, σ=${u.stats.stdDev} (${u.interpretation.spread}, ${u.interpretation.alignment})`,
          ``,
          `Higher alignment: ${moreAligned} (mean ${Math.max(d.stats.mean, u.stats.mean)})`,
          `Tighter bell:     ${tighter} (σ ${Math.min(d.stats.stdDev, u.stats.stdDev)})`,
        ].join('\n'),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('MCP server error:', err);
  process.exit(1);
});
