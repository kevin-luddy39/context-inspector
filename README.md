# Context Inspector

[![npm version](https://img.shields.io/npm/v/contrarianai-context-inspector.svg)](https://www.npmjs.com/package/contrarianai-context-inspector)
[![smithery badge](https://smithery.ai/badge/kevinluddy39/contrarianai-context-inspector)](https://smithery.ai/server/kevinluddy39/contrarianai-context-inspector)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> The drop-in MCP inspector for **Bell Tuning™** — reading the statistical bell curve of AI context windows to catch domain-alignment degradation 3 steps before output failure.

**Your AI system is failing 3 steps before you notice.** Context Inspector applies **Bell Tuning** to your AI workflow: continuously reading the statistical bell curve of context-window content so you can spot degradation as it forms, not after it ships.

📄 **Research-backed:** Every signal in this tool traces to a controlled experiment documented in the [white paper](docs/whitepaper.md).

## What is Bell Tuning?

**Bell Tuning** is the practice of treating an AI context window as a measurable distribution — and tuning your workflow against the shape of that distribution rather than against the output it eventually produces.

- **Tighter bell, right-shifted →** context is on-domain and consistent
- **Wider bell, drifting left →** contamination, summary loss, or topic drift entering
- **Flat bell near zero →** original content gone; system still answering, but on noise

You don't tune by listening to the output. You tune by watching the bell. Context Inspector is the instrument.

---

## 🚀 One-Command Install

```bash
npx contrarianai-context-inspector --install-mcp
```

This auto-detects **Claude Desktop, Claude Code, Cursor, Windsurf, or Cline** and adds the MCP server to your config. Restart your client, and you're done.

For a specific client: `--client=claude-desktop` (or `cursor`, `windsurf`, `cline`, `claude-code`).

---

## 🖥️ Claude Desktop Setup

### Quick install (recommended)

```bash
npx contrarianai-context-inspector --install-mcp --client=claude-desktop
```

Then restart Claude Desktop. Look for the hammer icon (🔨) in the bottom-right of the chat input — it should show **4 new tools** from `context-inspector`.

### Manual install

Edit `claude_desktop_config.json` at:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Add:

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

Save, restart Claude Desktop, and look for the hammer icon.

### What you'll see

<!-- Screenshots render automatically once PNGs are dropped into docs/assets/
     Capture guide: docs/assets/README.md -->

<table>
<tr>
<td width="33%" valign="top">
<b>1. Config file</b><br>
<a href="docs/assets/claude-desktop-config.png"><img src="docs/assets/claude-desktop-config.png" alt="claude_desktop_config.json showing the context-inspector mcpServers entry" onerror="this.style.display='none'"></a>
<br><sub>The <code>mcpServers → context-inspector</code> entry that the installer writes.</sub>
</td>
<td width="33%" valign="top">
<b>2. Hammer icon + tool list</b><br>
<a href="docs/assets/claude-desktop-hammer.png"><img src="docs/assets/claude-desktop-hammer.png" alt="Claude Desktop hammer icon with 4 context-inspector tools listed" onerror="this.style.display='none'"></a>
<br><sub>🔨 icon at bottom of chat. Click to see all 4 tools.</sub>
</td>
<td width="33%" valign="top">
<b>3. Tool call in action</b><br>
<a href="docs/assets/claude-desktop-tool-call.png"><img src="docs/assets/claude-desktop-tool-call.png" alt="Claude calling get_bell_curve with a sample text and showing the response" onerror="this.style.display='none'"></a>
<br><sub>Sample: <code>get_bell_curve</code> on the three-little-pigs sentence.</sub>
</td>
</tr>
</table>

> Screenshots not visible? They're captured per [`docs/assets/README.md`](docs/assets/README.md). Run the installer + verification prompt and drop the PNGs there.

**Expected indicators:**
- 🔨 Hammer icon visible at bottom of chat input
- Clicking it shows 4 tools: `analyze_context`, `get_bell_curve`, `get_chunks`, `compare_alignment`
- Tool tooltips describe what each one does

### Verify it works

Paste this into Claude Desktop:

> *Use the get_bell_curve tool to analyze this text: "The three little pigs built houses from straw, sticks, and bricks."*

Claude should call the tool and respond with a bell curve summary (mean, σ, histogram shape).

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| No hammer icon | Check config JSON is valid. Restart Claude Desktop fully (quit, not just close window). |
| Tools greyed out | Check the `npx` path in your shell (`which npx`). Claude Desktop uses system PATH. |
| "Server disconnected" | The first `npx -y` install can take 30-60s. Wait and try again. |
| Config file missing | Create the directory (`mkdir -p ~/Library/Application\ Support/Claude`), then add the JSON above. |

For Cursor, Windsurf, Cline, or Claude Code — use the same JSON but in the respective client's config file (the installer does this automatically).

---

## Need Help Diagnosing Context Degradation?

Seeing σ collapse, flattening bell curves, or early mean drift in your MCP workflow?

I offer **AI System Diagnosis Consulting** this week:
- Attach the inspector to your existing MCP setup (Claude Desktop, Cursor, custom agents, etc.)
- Run real-time analysis on your context flows
- Deliver a prioritized report with root causes and fixes (refresh strategies, eviction rules, prompt hygiene, etc.)
- Built from the research in the [white paper](docs/whitepaper.md)

Book a **30-minute discovery call** (free or low-cost) this week: **[cal.com/kevin-luddy-0dlzuu](https://cal.com/kevin-luddy-0dlzuu)**

Let's find what's actually wrong with your AI before your users do.

---

```bash
# AI-guided setup — the easiest way to start
npx contrarianai-context-inspector --setup

# Analyze a file from the command line
npx contrarianai-context-inspector conversation.txt --domain --verbose

# Web dashboard
npx contrarianai-context-inspector --serve
```

**MCP integration** — add to your `.mcp.json` (don't run `--mcp` manually):
```json
{
  "mcpServers": {
    "context-inspector": {
      "command": "npx",
      "args": ["contrarianai-context-inspector", "--mcp"]
    }
  }
}
```

<!-- Screenshot: Bell curve shifting from tight/right to flat/left with annotation -->
<!-- TODO: Replace with actual GIF of dashboard step slider scrubbing steps 10→15 -->
![Context Inspector Dashboard](docs/assets/dashboard-preview.png)
*The bell curve at step 10 (healthy, right-shifted) vs step 15 (collapsed, flat). The graph warned 3 steps before the output failed.*

---

## The Problem

Most teams evaluate AI by checking the output. The answer looks right? Ship it.

But the context window can be structurally degraded while the output still appears correct. By the time the output fails, the context has already been compromised — and recovery may be impossible.

**Context Inspector watches the context, not the output.** It computes domain alignment distributions across every chunk and alerts when the bell curve starts to flatten — the statistical signature of context rot.

## What It Measures

| Metric | What It Tells You |
|--------|------------------|
| **Domain σ** (standard deviation) | How consistently the context aligns with the target domain. Rising σ = contamination entering. Collapsing σ toward zero = original content gone. |
| **Domain mean** | Where the bell curve is centered. Leftward drift = domain alignment weakening. |
| **Bell curve shape** | Tight right-shifted = healthy. Bimodal = contamination present. Flat near zero = total rot. |
| **Per-chunk scores** | Individual measurements shown as a rug plot. See exactly which chunks are on-topic and which aren't. |

Plus: readability scores, sentiment, entropy, cosine similarity, N-grams, POS tagging, NER, LDA topics, BPE token counts, and the full statistical suite (skewness, kurtosis, percentiles, IQR, MAD, z-scores, trend detection, correlation, moving averages).

## From White Paper to Tool

> *"We found that context degradation follows predictable statistical patterns. The bell curve of domain alignment scores is a leading indicator that reveals structural decay before output quality degrades."*
>
> — [Context Rot: Statistical Early Warning for AI System Degradation](docs/whitepaper.md)

The white paper documents a controlled experiment: feeding fairy tales through an AI system with a constrained context window, then progressively adding unrelated content (Cinderella, Christopher Columbus, the Battle of the Alamo) while monitoring the bell curve.

**Key finding:** The bell curve σ spiked at step 11 while the output still scored 0.85. Three steps later, the output collapsed to 0.00 — and never recovered. **The graph saw it coming. The output didn't.**

Every metric and visualization in Context Inspector was designed to surface this specific signal. The tool is the research, productized.

[Read the full white paper →](docs/whitepaper.md)

## Quick Start

### As an MCP Server (drop into any AI workflow)

Add to your `.mcp.json` or `claude_desktop_config.json` (then restart your MCP client):

```json
{
  "mcpServers": {
    "context-inspector": {
      "command": "npx",
      "args": ["contrarianai-context-inspector", "--mcp"]
    }
  }
}
```

> **Note:** Don't run `--mcp` manually in your terminal — it's a stdio server that MCP clients manage. Use `--setup` or `--serve` for interactive use.

**Available MCP tools:**

| Tool | Description |
|------|------------|
| `analyze_context` | Full analysis: domain/user alignment, stats, bell curve data, per-chunk breakdown |
| `get_bell_curve` | Quick bell curve stats (mean, σ, histogram) for domain or user alignment |
| `get_chunks` | Per-chunk scores with top-N highest and lowest scoring chunks |
| `compare_alignment` | Side-by-side domain vs user alignment comparison |

### CLI

```bash
# Domain alignment (default) — reports σ, mean, histogram
npx contrarianai-context-inspector conversation.txt

# User alignment
npx contrarianai-context-inspector conversation.txt --user

# Custom chunk size
npx contrarianai-context-inspector conversation.txt --chunk-size 300

# Full JSON output (pipe to jq, store, compare)
npx contrarianai-context-inspector conversation.txt --json

# Per-chunk breakdown with visual bars
npx contrarianai-context-inspector conversation.txt --verbose

# Read from stdin
cat system-prompt.txt | npx contrarianai-context-inspector -
```

**Example output:**
```
  context-inspector — domain alignment

  Input:       4,696 chars, 10 chunks @ 500 chars
  Mean:        0.7867
  Std Dev:     0.2455  [moderate]
  Median:      0.8319
  Skewness:    -0.6421
  Kurtosis:    -0.3812
  Range:       0.2884 — 1.0000
  Alignment:   strong
  Narrative:   moderate bell curve (σ=0.2455): strong domain-aligned content.

  Distribution (domain):

  0.00 |
  0.05 |
  0.10 |
  0.15 |
  0.20 |#########
  0.25 |
  0.30 |
  ...
  0.85 |#########################################
  0.90 |##################
  0.95 |#########
  1.00
```

### Web Dashboard

```bash
# Analysis tool (port 4000)
npx contrarianai-context-inspector --serve

# Simulation dashboard (port 4001)
node sim/index.js
```

The web dashboard provides:
- Interactive bell curve with mean line (red), ±1σ/±2σ bands (blue), Gaussian fit (green), rug plot (white dots)
- Concentrator toggle (domain vs user)
- Chunk size slider
- Color-coded chunk view sorted by alignment score

## Context Inspector vs MCP Inspector

| | **Anthropic MCP Inspector** | **Context Inspector** |
|---|---|---|
| **Purpose** | Debug MCP tool calls and responses | Monitor context window statistical health |
| **Approach** | Manual testing of individual tool calls | Proactive statistical monitoring across turns |
| **What it shows** | Tool input/output, error messages, latency | Bell curve shape, σ trend, domain drift, chunk scores |
| **When to use** | "Is my MCP tool returning the right data?" | "Is my context degrading before my output fails?" |
| **Integration** | Standalone debugging UI | MCP server that drops into any workflow |
| **Detects** | Tool errors, schema mismatches | Context rot, domain drift, contamination, information loss |

**They're complementary.** MCP Inspector verifies that tools work correctly. Context Inspector verifies that the context built from tool results remains structurally sound. Use both.

## Simulation Framework

Context Inspector includes a simulation framework for testing context management strategies:

```bash
# Run 150 simulations (50 per scenario: RAG, multi-agent, support bot)
node sim/runner.js

# Run the context rot experiment (fairy tales + contamination)
node sim/rot-runner.js

# Run a specific story
node sim/rot-runner.js --story three_little_pigs

# Start the simulation dashboard
node sim/index.js
```

### Pre-built scenarios:

| Scenario | What it simulates | Failure patterns injected |
|----------|------------------|--------------------------|
| **RAG Pipeline** | Retrieval drift, context accumulation | Irrelevant retrieval, context overflow |
| **Multi-Agent** | Coordinator + researcher + coder + reviewer | Coordination bloat, tool misroute, self-evaluation |
| **Support Bot** | Customer conversation with topic changes | Topic drift, sentiment escalation |
| **Story Lessons** | Context rot demonstration with fairy tales | Drop-oldest + resummarize, progressive contamination |

Each simulation stores per-step analysis data (domain/user stats, bell curve snapshots, lessons alignment scores) in SQLite for comparison across runs.

## Architecture

```
context-inspector/
├── core.js              # Analysis engine (TF-IDF, stats, NLP, scoring)
├── cli.js               # Command-line interface
├── mcp-server.js        # MCP server (stdio transport, 4 tools)
├── web-server.js        # Web UI server (port 4000)
├── web/index.html       # Analysis web UI
├── docs/
│   └── whitepaper.md    # Research paper
└── sim/
    ├── index.js          # Simulation dashboard server (port 4001)
    ├── runner.js          # Batch simulation runner
    ├── rot-runner.js      # Context rot experiment runner
    ├── story-runner.js    # Story lessons runner
    ├── engine.js          # Simulation engine
    ├── db.js              # SQLite storage
    ├── llm.js             # Anthropic API integration
    ├── scoring.js         # Vector alignment scoring
    ├── seed-rng.js        # Deterministic PRNG
    ├── scenarios/          # RAG, multi-agent, support bot, story-rot
    ├── content/            # Templates for simulation content
    ├── stories/            # Fairy tale texts + ground truth
    └── web/index.html      # Simulation dashboard UI
```

## Dependencies

| Package | Purpose | Required? |
|---------|---------|:---------:|
| `express` | Web UI server | Yes |
| `@modelcontextprotocol/sdk` | MCP server | Yes |
| `gpt-tokenizer` | Exact BPE token counting | Optional (falls back to word estimate) |
| `compromise` | POS tagging, NER | Optional (skipped if not installed) |
| `lda` | Topic modeling | Optional (skipped if not installed) |
| `sql.js` | Simulation data storage | For simulations only |
| `ws` | WebSocket for live dashboard | For simulations only |
| `@anthropic-ai/sdk` | LLM calls in story experiments | For story simulations only |

## License

MIT

---

## Need help diagnosing context rot in production?

Context Inspector surfaces the signal. Acting on it — redesigning retrieval, rewriting prompts, rebuilding memory strategies — is where most teams get stuck.

**[contrarianAI](https://contrarianai-landing.onrender.com)** consults on exactly this:

- **Context audits** — we instrument your pipeline, find where the bell curve collapses, and show you why.
- **Architecture reviews** — RAG, multi-agent, long-running chat. We pressure-test the parts you can't see failing yet.
- **White-paper-grade diagnostics** — the same methodology documented in [`docs/whitepaper.md`](docs/whitepaper.md), applied to your system.

We find what's actually wrong with your AI before your users do. → **[contrarianai-landing.onrender.com](https://contrarianai-landing.onrender.com)**
