/**
 * Smithery entry point for Context Inspector
 *
 * Wraps the existing stdio MCP server as a function Smithery can deploy
 * to their hosted runtime. Exposes all 4 tools:
 * analyze_context, get_bell_curve, get_chunks, compare_alignment.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "@smithery/sdk";
// @ts-ignore — pure JS module
import { analyzeContext } from "../core/analyzer.js";

export const configSchema = z.object({
  anthropicApiKey: z.string().optional().describe(
    "Optional — only needed for the --setup wizard. MCP tool calls do not require this."
  ),
});

export default function createServer({
  config,
}: ServerContext<z.infer<typeof configSchema>>) {
  const server = new McpServer({
    name: "context-inspector",
    version: "0.2.11",
  });

  server.tool(
    "analyze_context",
    "Analyze text for domain and user alignment. Returns statistics, bell curve data, and per-chunk breakdown.",
    {
      text: z.string().describe("The context text to analyze"),
      chunkSize: z.number().optional().default(500).describe("Chunk size in characters (default 500)"),
      concentrator: z.enum(["domain", "user"]).optional().default("domain").describe("Alignment dimension to focus on"),
    },
    async ({ text, chunkSize, concentrator }: { text: string; chunkSize?: number; concentrator?: "domain" | "user" }) => {
      const result = analyzeContext(text, { chunkSize });
      const side = concentrator === "user" ? result.user : result.domain;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            summary: result.summary,
            concentrator,
            stats: side.stats,
            interpretation: side.interpretation,
            chunks: result.chunks.map((c: any) => ({
              index: c.index,
              score: concentrator === "user" ? c.userScore : c.domainScore,
              length: c.length,
              preview: c.text.slice(0, 100),
            })),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_bell_curve",
    "Get the bell curve statistics (mean, std dev, histogram) for domain or user alignment of a text.",
    {
      text: z.string().describe("The context text to analyze"),
      concentrator: z.enum(["domain", "user"]).optional().default("domain"),
      chunkSize: z.number().optional().default(500),
    },
    async ({ text, concentrator, chunkSize }: { text: string; concentrator?: "domain" | "user"; chunkSize?: number }) => {
      const result = analyzeContext(text, { chunkSize });
      const side = concentrator === "user" ? result.user : result.domain;
      return {
        content: [{
          type: "text",
          text: [
            `Bell Curve: ${concentrator} alignment`,
            `Mean:     ${side.stats.mean}`,
            `Std Dev:  ${side.stats.stdDev}  (${side.interpretation.spread})`,
            `Skewness: ${side.stats.skewness}`,
            `Kurtosis: ${side.stats.kurtosis}`,
            `Chunks:   ${side.stats.count}`,
            ``,
            side.interpretation.narrative,
          ].join("\n"),
        }],
      };
    }
  );

  server.tool(
    "get_chunks",
    "Get per-chunk alignment scores and text. Useful for finding which parts of the context are most/least aligned.",
    {
      text: z.string().describe("The context text to analyze"),
      concentrator: z.enum(["domain", "user"]).optional().default("domain"),
      chunkSize: z.number().optional().default(500),
      topN: z.number().optional().default(5).describe("Top N highest-scoring chunks"),
      bottomN: z.number().optional().default(5).describe("Bottom N lowest-scoring chunks"),
    },
    async ({ text, concentrator, chunkSize, topN, bottomN }: { text: string; concentrator?: "domain" | "user"; chunkSize?: number; topN?: number; bottomN?: number }) => {
      const result = analyzeContext(text, { chunkSize });
      const scored = result.chunks.map((c: any) => ({
        index: c.index,
        score: concentrator === "user" ? c.userScore : c.domainScore,
        text: c.text,
      }));
      const sorted = [...scored].sort((a, b) => b.score - a.score);
      const output: any = { total: scored.length, concentrator };
      if (topN && topN > 0) output.highestScoring = sorted.slice(0, topN);
      if (bottomN && bottomN > 0) output.lowestScoring = sorted.slice(-bottomN);
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
    }
  );

  server.tool(
    "compare_alignment",
    "Compare domain vs user alignment for a context. Shows which dimension the content is more tightly aligned to.",
    {
      text: z.string().describe("The context text to analyze"),
      chunkSize: z.number().optional().default(500),
    },
    async ({ text, chunkSize }: { text: string; chunkSize?: number }) => {
      const result = analyzeContext(text, { chunkSize });
      const d = result.domain;
      const u = result.user;
      const moreAligned = d.stats.mean > u.stats.mean ? "domain" : "user";
      const tighter = d.stats.stdDev < u.stats.stdDev ? "domain" : "user";
      return {
        content: [{
          type: "text",
          text: [
            `Domain:  mean=${d.stats.mean}, σ=${d.stats.stdDev} (${d.interpretation.spread}, ${d.interpretation.alignment})`,
            `User:    mean=${u.stats.mean}, σ=${u.stats.stdDev} (${u.interpretation.spread}, ${u.interpretation.alignment})`,
            ``,
            `Higher alignment: ${moreAligned} (mean ${Math.max(d.stats.mean, u.stats.mean)})`,
            `Tighter bell:     ${tighter} (σ ${Math.min(d.stats.stdDev, u.stats.stdDev)})`,
          ].join("\n"),
        }],
      };
    }
  );

  return server.server;
}

/**
 * Sandbox server — used by Smithery's scanner to enumerate tools
 * without needing real config.
 */
export function createSandboxServer() {
  return createServer({
    config: { anthropicApiKey: undefined },
  } as ServerContext<z.infer<typeof configSchema>>);
}
