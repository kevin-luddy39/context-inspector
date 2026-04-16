# Community Posts — Traffic & Marketplace Signals

Posting in these communities triggers marketplace crawlers and validators to re-scan your listing. More importantly, it drives real users who then become validation signals.

---

## Hacker News — Show HN

**Title:** Show HN: Context Inspector — bell curves that flag AI context rot before output fails

**URL field:** https://github.com/kevin-luddy39/context-inspector

**Text post:**

I got tired of debugging AI systems by watching outputs get gradually worse. Output evaluation is a lagging indicator — by the time you notice the answer is wrong, the context has been degrading for multiple turns.

So I built a tool that monitors the *statistical structure* of the context window. It chunks the context, scores each chunk against a fixed domain reference using TF-IDF, and plots the bell curve of alignment scores. When σ spikes or the mean drifts left, context rot is happening — usually before the output quality drops.

I tested it with a controlled experiment: fed nursery rhymes through an AI system with a constrained context window, then progressively added unrelated content (Cinderella → Columbus → Alamo). The bell curve flagged degradation 3 steps before the LLM-as-judge score hit 0.00.

It's MCP-aware, so it drops into any Claude Code / Cursor / custom agent setup:
```
npx contrarianai-context-inspector --mcp
```

Or the AI-guided setup wizard if you want help configuring:
```
npx contrarianai-context-inspector --setup
```

White paper with the experimental results: https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md

Happy to answer questions about the methodology, implementation, or edge cases.

---

## Reddit — r/LocalLLaMA

**Title:** I built an MCP server that catches context rot before your AI fails (with bell curves)

Most AI monitoring checks the output. That's a lagging indicator.

I made a tool that watches the *context window* for statistical drift. It computes TF-IDF alignment between each chunk and a fixed domain reference, then plots the distribution. When the bell curve flattens or shifts left, something is wrong — and it usually shows up before the output degrades.

Built as an MCP server so you can drop it into any agent setup. Also has a CLI, a web dashboard, and an AI-guided setup wizard that scans your project and generates an ideal domain reference.

The methodology is documented in a white paper based on a 40-step experiment: in Three Little Pigs with progressive contamination, σ spiked at step 11 while the output judge was still scoring 0.85. Three steps later the output collapsed to 0.00 and never recovered. The graph saw it coming.

```
npx contrarianai-context-inspector --setup
```

GitHub: https://github.com/kevin-luddy39/context-inspector
White paper: https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md

MIT licensed. Open to feedback.

---

## Reddit — r/mcp (and r/ClaudeAI)

**Title:** New MCP server for context window health monitoring

I just published contrarianai-context-inspector on npm. It's an MCP server that exposes 4 tools for statistical analysis of context windows:

- `analyze_context` — full bell curve + per-chunk breakdown
- `get_bell_curve` — quick σ/mean/histogram
- `get_chunks` — sort chunks by domain alignment
- `compare_alignment` — domain vs user alignment

The idea: instead of checking if the output is correct, check if the context is *structurally* healthy. A flattening bell curve is a leading indicator of output failure.

Drops in as:
```json
{
  "mcpServers": {
    "context-inspector": {
      "command": "npx",
      "args": ["-y", "contrarianai-context-inspector", "--mcp"]
    }
  }
}
```

Complementary to the official MCP Inspector (which debugs tool calls). This watches what the tool calls *do* to your context over time.

Would appreciate feedback on the methodology — white paper at https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md

---

## LinkedIn

**Title (no title — just post):**

Most teams evaluate AI by checking the output. The answer looks right? Ship it.

The problem: the context window can be structurally degraded while the output still looks fine. By the time you notice, the context has been rotting for multiple turns.

I ran a controlled experiment to prove this. 40 steps of progressive context contamination + forced summarization. At step 11, the bell curve σ spiked 56%. The output judge was still scoring 0.85 — passing. Three steps of continued σ decline, output still passing. Step 15: total collapse. Judge hit 0.00. Never recovered.

The graph saw it coming. The output didn't.

I built this into an MCP server that drops into any AI workflow: npx contrarianai-context-inspector --mcp

The white paper, methodology, and simulation results are open source: https://github.com/kevin-luddy39/context-inspector

If you're running AI in production — RAG pipelines, long-context chatbots, multi-agent systems — you should be monitoring the bell curve, not just the output.

#AI #ContextRot #MCP #AIMonitoring #ProductionAI

---

## Posting schedule (don't blast all at once)

| Day | Platform | Notes |
|-----|----------|-------|
| Day 1 (Tuesday) | HN Show | Best engagement window: 8-10am PT Tuesday |
| Day 2 | r/LocalLLaMA | Post after HN traction |
| Day 3 | LinkedIn | Include a screenshot from the dashboard |
| Day 4 | r/mcp + r/ClaudeAI | Shorter, more technical |
| Day 7 | Follow up: reply to HN comments with results, post a v2 update |

Track referrer data in your admin dashboard to see which channels drove real adoption.
