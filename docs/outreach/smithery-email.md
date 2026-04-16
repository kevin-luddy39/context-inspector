# Email Draft: Smithery Validation Request

**To:** support@smithery.ai
**Subject:** Validation request: context-inspector — first MCP server for statistical context monitoring

---

Hi Smithery team,

I just published **contrarianai-context-inspector** to npm and added a `smithery.yaml` to the repo. I'd like to request validation on the listing.

**What it does:** It's the first MCP server (that I've found) focused on *proactive statistical monitoring* of AI context windows, rather than debugging tool calls. It computes domain alignment distributions across context chunks and detects the bell curve degradation pattern that signals context rot before the output quality drops.

**Why it's different from existing MCP servers:**
- Anthropic's MCP Inspector → great for manual debugging of tool calls
- Context Inspector → continuous statistical monitoring of context window health

We're complementary, not competitive. MCP Inspector answers "is my tool working?" — Context Inspector answers "is my context about to fail?"

**Research backing:** The methodology is documented in a white paper in the repo ([docs/whitepaper.md](https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md)). I ran a controlled experiment with 40 steps of progressive context contamination + forced summarization across three base stories. The bell curve σ flagged degradation **3 steps before** output evaluation caught the failure. The tool implements the exact metrics that surfaced in the experiment.

**Key links:**
- npm: https://www.npmjs.com/package/contrarianai-context-inspector
- GitHub: https://github.com/kevin-luddy39/context-inspector
- White paper: https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md
- 4 MCP tools: `analyze_context`, `get_bell_curve`, `get_chunks`, `compare_alignment`

**How to test it:**
```bash
npx -y contrarianai-context-inspector --mcp
```

Or use the AI-guided setup wizard at `npx -y contrarianai-context-inspector --setup` which walks users through configuration and auto-generates their `.mcp.json`.

Happy to answer questions or provide any additional validation material you need. Would love to get the "Validated" badge and help users find the tool.

Thanks,

Kevin Luddy
kevin.luddy39@gmail.com
https://contrarianai-landing.onrender.com
