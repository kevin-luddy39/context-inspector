# Screenshots — Capture Guide

These three PNGs support the **Claude Desktop Setup** section of the main README. Replace this file with the actual screenshots.

## 1. `claude-desktop-config.png`

**What:** The `claude_desktop_config.json` file open in an editor with the `mcpServers → context-inspector` block visible.

**How to capture:**

1. Run the installer to generate the config:
   ```bash
   npx contrarianai-context-inspector --install-mcp --client=claude-desktop
   ```

2. Open the generated file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

3. Open it in VS Code, TextEdit, or any editor with syntax highlighting.

4. Screenshot the full visible JSON. **Highlight/box the `context-inspector` entry** using:
   - VS Code: `Cmd+/` comment toggle, or just arrow-draw via screenshot tool
   - macOS screenshot shortcut: `Cmd+Shift+4`
   - Windows: `Win+Shift+S`

**Expected content (this is what the installer writes):**

```json
{
  "mcpServers": {
    "context-inspector": {
      "command": "npx",
      "args": [
        "-y",
        "contrarianai-context-inspector",
        "--mcp"
      ]
    }
  }
}
```

---

## 2. `claude-desktop-hammer.png`

**What:** Claude Desktop's chat window showing the hammer icon 🔨 in the bottom-right of the input, ideally with the popover open listing the 4 tools.

**How to capture:**

1. Open Claude Desktop (fully quit and relaunch after editing the config).
2. Start a new chat.
3. Click the hammer icon in the bottom-right of the chat input field.
4. When the tool list pops up, screenshot the full chat window including the popover.

**Expected visible:**
- Hammer icon highlighted or active
- Popover listing 4 tools:
  - `context-inspector:analyze_context`
  - `context-inspector:get_bell_curve`
  - `context-inspector:get_chunks`
  - `context-inspector:compare_alignment`
- Each tool has a short description from the tool registration

---

## 3. `claude-desktop-tool-call.png`

**What:** Claude actually invoking a tool, with the tool-call box and its response visible.

**How to capture:**

1. In Claude Desktop, paste the verification prompt:

   > Use the `get_bell_curve` tool to analyze this text: "The three little pigs built houses from straw, sticks, and bricks."

2. Claude will show a tool-call box asking permission (if that's your setting) or just execute.
3. After execution, the collapsed tool-call block appears with the result.
4. Click to expand it so both the request and response are visible.
5. Screenshot the entire turn (prompt + tool call + response).

**Expected response excerpt (from the live server):**
```
Bell Curve: domain alignment
Mean:     1
Std Dev:  0  (very tight)
Skewness: 0
Kurtosis: -3
Chunks:   1
```

(A single chunk of fully on-topic text scores 1.0 with zero variance — which is itself a useful illustration of what "perfect alignment" looks like.)

---

## File size recommendations

- Keep each PNG under **500KB** for fast repo clones
- Target dimensions: **1200–1600px wide** (reasonable on GitHub's rendering)
- Use tools like TinyPNG if needed to compress

## Once captured

Drop the three files here (replacing or alongside this README.md):
- `claude-desktop-config.png`
- `claude-desktop-hammer.png`
- `claude-desktop-tool-call.png`

The main `README.md` (lines 63–67) already references these exact paths — no other changes needed. GitHub, npm, and Smithery will all pick them up automatically.
