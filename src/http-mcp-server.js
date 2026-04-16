#!/usr/bin/env node
/**
 * Streamable HTTP MCP Server
 *
 * Exposes the Context Inspector MCP tools over HTTP so that
 * hosted MCP registries (Smithery, etc.) can scan capabilities
 * without running the stdio binary.
 *
 * Endpoint: POST /mcp  — MCP JSON-RPC over HTTP with SSE for streaming
 * Endpoint: GET  /      — health/info
 * Endpoint: GET  /ping   — keepalive for free-tier hosts
 */

const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const { analyzeContext } = require('./core/analyzer');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// CORS for Smithery scanner
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Last-Event-Id');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'context-inspector',
    version: '0.2.12',
    transport: 'streamable-http',
    endpoint: '/mcp',
    tools: ['analyze_context', 'get_bell_curve', 'get_chunks', 'compare_alignment'],
    docs: 'https://github.com/kevin-luddy39/context-inspector',
  });
});

app.get('/ping', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Build a fresh MCP server per request (stateless) ──────
function createMcpServer() {
  const server = new McpServer({ name: 'context-inspector', version: '0.2.12' });

  server.tool(
    'analyze_context',
    'Full context analysis — domain/user alignment, statistics, bell curve data, per-chunk breakdown.',
    {
      text: z.string().describe('The context text to analyze'),
      chunkSize: z.number().optional().default(500).describe('Chunk size in characters'),
      concentrator: z.enum(['domain', 'user']).optional().default('domain'),
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

  server.tool(
    'get_bell_curve',
    'Quick bell curve summary (mean, σ, histogram) for domain or user alignment of a text.',
    {
      text: z.string(),
      concentrator: z.enum(['domain', 'user']).optional().default('domain'),
      chunkSize: z.number().optional().default(500),
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
            '',
            side.interpretation.narrative,
          ].join('\n'),
        }],
      };
    }
  );

  server.tool(
    'get_chunks',
    'Per-chunk alignment scores with top-N highest and lowest-scoring chunks.',
    {
      text: z.string(),
      concentrator: z.enum(['domain', 'user']).optional().default('domain'),
      chunkSize: z.number().optional().default(500),
      topN: z.number().optional().default(5),
      bottomN: z.number().optional().default(5),
    },
    async ({ text, concentrator, chunkSize, topN, bottomN }) => {
      const result = analyzeContext(text, { chunkSize });
      const scored = result.chunks.map(c => ({
        index: c.index,
        score: concentrator === 'user' ? c.userScore : c.domainScore,
        text: c.text,
      }));
      const sorted = [...scored].sort((a, b) => b.score - a.score);
      const out = { total: scored.length, concentrator };
      if (topN > 0) out.highestScoring = sorted.slice(0, topN);
      if (bottomN > 0) out.lowestScoring = sorted.slice(-bottomN);
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }
  );

  server.tool(
    'compare_alignment',
    'Side-by-side domain vs user alignment comparison.',
    {
      text: z.string(),
      chunkSize: z.number().optional().default(500),
    },
    async ({ text, chunkSize }) => {
      const result = analyzeContext(text, { chunkSize });
      const d = result.domain, u = result.user;
      return {
        content: [{
          type: 'text',
          text: [
            `Domain:  mean=${d.stats.mean}, σ=${d.stats.stdDev} (${d.interpretation.spread}, ${d.interpretation.alignment})`,
            `User:    mean=${u.stats.mean}, σ=${u.stats.stdDev} (${u.interpretation.spread}, ${u.interpretation.alignment})`,
            '',
            `Higher alignment: ${d.stats.mean > u.stats.mean ? 'domain' : 'user'} (mean ${Math.max(d.stats.mean, u.stats.mean)})`,
            `Tighter bell:     ${d.stats.stdDev < u.stats.stdDev ? 'domain' : 'user'} (σ ${Math.min(d.stats.stdDev, u.stats.stdDev)})`,
          ].join('\n'),
        }],
      };
    }
  );

  return server;
}

// ── MCP Endpoint (Streamable HTTP) ──────────────────────
// Stateless mode: new server + transport per request (simplest, works with scanners)
app.all('/mcp', async (req, res) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close?.();
      server.close?.();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error', data: err.message },
        id: null,
      });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Context Inspector HTTP MCP server on :${PORT}`);
  console.log(`  MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`  Health:       GET  http://localhost:${PORT}/`);
});
