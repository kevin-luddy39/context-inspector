# Smithery Listing Content — Context Inspector

Go to **https://smithery.ai/server/kevinluddy39/contrarianai-context-inspector** and paste each section into the appropriate field on the edit page.

---

## Short Description (for search/card view — ~150 chars)

```
Catch AI context rot before output fails. Monitors domain alignment bell curves to detect degradation 3 steps before traditional evaluation.
```

---

## Long Description / README (the main body)

```markdown
# Context Inspector

**Your AI system is failing 3 steps before you notice.** Context Inspector monitors the statistical structure of AI context windows in real time. It detects domain alignment degradation — the leading indicator of output failure — before the output itself degrades.

## The Problem

Most teams evaluate AI by checking the output. The answer looks right? Ship it.

But the context window can be structurally degraded while the output still appears correct. By the time you notice the answer is wrong, the context has been rotting for multiple turns — and recovery may be impossible.

## What It Does

Context Inspector watches the context, not the output. It computes domain alignment distributions across every chunk and alerts when the bell curve starts to flatten — the statistical signature of context rot.

### 4 MCP Tools

| Tool | Description |
|------|-------------|
| `analyze_context` | Full analysis: domain/user alignment, stats, bell curve data, per-chunk breakdown |
| `get_bell_curve` | Quick bell curve summary (mean, σ, histogram) for domain or user alignment |
| `get_chunks` | Per-chunk alignment scores with top-N highest and lowest |
| `compare_alignment` | Side-by-side domain vs user alignment comparison |

## Quick Start

### Install via MCP client (Claude Desktop, Cursor, Claude Code, etc.)

Add to your `.mcp.json` or `claude_desktop_config.json`:

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

Restart your MCP client. The 4 tools appear automatically.

### AI-Guided Setup Wizard

```bash
npx contrarianai-context-inspector --setup
```

Launches a web UI that scans your project, auto-generates a domain reference, detects structural issues, and outputs a ready-to-paste `.mcp.json`.

### CLI

```bash
npx contrarianai-context-inspector conversation.txt --domain --verbose
```

## Research-Backed

Every metric traces to a controlled experiment documented in the [white paper](https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md).

**Key finding:** In a 40-step contamination experiment, the bell curve σ flagged degradation **3 steps before** LLM-as-judge scoring caught the failure. The graph saw it coming — the output didn't.

## vs. Anthropic's MCP Inspector

- **MCP Inspector** → great for manual debugging of tool calls
- **Context Inspector** → continuous statistical monitoring of context window health

They're complementary, not competitive. MCP Inspector verifies tools work correctly. Context Inspector verifies the context *built from* those tool results stays structurally sound over turns.

## Features

- **TF-IDF domain alignment** with fixed-reference support (measure drift against a baseline, not a moving target)
- **Bell curve visualization** with mean, ±1σ/±2σ bands, Gaussian fit, rug plot of individual measurements
- **Full statistical suite**: mean, σ, skewness, kurtosis, percentiles, IQR, MAD, z-scores, trend detection
- **Extended NLP**: readability scores, sentiment, entropy, cosine similarity, N-grams, POS tagging, LDA topics
- **Porter stemmer + negation handling** for accurate domain matching
- **Zero-config drop-in** via MCP

## Links

- 📦 [npm](https://www.npmjs.com/package/contrarianai-context-inspector)
- 🐙 [GitHub](https://github.com/kevin-luddy39/context-inspector)
- 📄 [White Paper](https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md)
- 🔧 [AI Production Diagnostic](https://contrarianai-landing.onrender.com) — need help diagnosing context rot in production?

## License

MIT

---

*Built by [contrarianAI](https://contrarianai-landing.onrender.com). We find what's actually wrong with your AI before your users do.*
```

---

## Tags / Keywords

```
context-rot, monitoring, diagnostic, bell-curve, domain-alignment, statistical, leading-indicator, tfidf, mcp, nlp, ai-monitoring, ai-diagnostics, claude, observability, prompt-engineering
```

---

## Homepage URL

```
https://github.com/kevin-luddy39/context-inspector
```

## Documentation URL

```
https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md
```

## Repository URL

```
https://github.com/kevin-luddy39/context-inspector
```

## License

```
MIT
```

---

## After publishing

1. **Star your own listing** from a second browser session — helps with ranking
2. **Share the Smithery URL in your README** — "Available on Smithery: [link]"
3. **Post on Twitter/X** tagging @smithery_ai with "Just published Context Inspector on Smithery"
4. **Add Smithery badge to GitHub README**:
   ```markdown
   [![smithery badge](https://smithery.ai/badge/kevinluddy39/contrarianai-context-inspector)](https://smithery.ai/server/kevinluddy39/contrarianai-context-inspector)
   ```
