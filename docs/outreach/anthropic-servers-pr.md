# PR for modelcontextprotocol/servers

**Repo:** https://github.com/modelcontextprotocol/servers
**File to edit:** `README.md` — specifically the "🌎 Community Servers" section (alphabetical by name).

## Steps

1. Fork `modelcontextprotocol/servers`
2. Edit `README.md`
3. Add this entry in alphabetical order within "🌎 Community Servers":

```markdown
- **[Context Inspector](https://github.com/kevin-luddy39/context-inspector)** — Statistical early warning for AI context window degradation. Monitors domain alignment bell curves to detect context rot 3 steps before output failure. Research-backed ([white paper](https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md)).
```

4. Commit message: `Add Context Inspector to community servers`
5. Submit PR with the description below.

---

## PR Description

### What it does
Adds **Context Inspector** to the Community Servers list.

Context Inspector is an MCP server that monitors the statistical health of AI context windows. Unlike existing tools that debug tool calls (including the official MCP Inspector), this provides *proactive* monitoring — it computes domain alignment distributions across context chunks and surfaces the bell curve degradation pattern that signals context rot before output fails.

### Why it's worth including
- **Complementary to existing tools**: MCP Inspector verifies tools work correctly. Context Inspector verifies that the context *built from* those tool responses remains structurally sound over turns.
- **Research-backed**: The methodology is documented in a [white paper](https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md) based on a controlled experiment with 40-step context contamination runs. The bell curve σ flagged degradation 3 steps before output evaluation caught failure.
- **Zero-config drop-in**: `npx contrarianai-context-inspector --mcp` via any `.mcp.json`. No manual setup.

### MCP tools exposed
| Tool | Description |
|------|-------------|
| `analyze_context` | Full analysis: domain/user alignment, stats, bell curve data, per-chunk breakdown |
| `get_bell_curve` | Quick bell curve summary (mean, σ, histogram) |
| `get_chunks` | Per-chunk alignment scores with top-N highest/lowest |
| `compare_alignment` | Side-by-side domain vs user alignment comparison |

### Verification
- npm: https://www.npmjs.com/package/contrarianai-context-inspector
- Source: https://github.com/kevin-luddy39/context-inspector
- Tests: 11/11 passing (run `npm test`)
- License: MIT

### How to try it
```bash
# Add to .mcp.json
{
  "mcpServers": {
    "context-inspector": {
      "command": "npx",
      "args": ["-y", "contrarianai-context-inspector", "--mcp"]
    }
  }
}
```

Or use the AI-guided setup wizard: `npx contrarianai-context-inspector --setup`

---

## After the PR

1. Tag relevant maintainers in the PR if alphabetization conflicts arise
2. If the PR is merged, the listing will automatically appear on https://modelcontextprotocol.io/servers (the official discovery page)
3. Post in MCP-related Discord/Slack channels mentioning the merge — other directories crawl this README and will auto-add
