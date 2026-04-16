# Project Diary

## 2026-04-16

- Added opt-in local persistence for the Anthropic API key in the setup wizard. Stored at `~/.context-inspector/credentials.json` (dir 0700, file 0600) — never written without explicit user action.
- New endpoints in `src/setup-wizard.js`: `POST /api/setup/key/save`, `POST /api/setup/key/use-stored`, `DELETE /api/setup/key/stored`; `GET /api/setup/status` now returns `hasStoredKey` + `storedKeyHint`.
- UI (`web/setup/index.html`): banner on load offering to use the saved key (masked to `sk-ant-…abc1`, never auto-populated into the password field) and a post-validation prompt asking whether to save the current key locally.
- Welcome text updated from "not stored" to "not stored unless you opt in".

## 2026-04-13

- Added `.claude/` configuration directory with SSA-LAB commands, example specs, and settings.
- Added `CLAUDE.md` with project guidance for Claude Code.
- Created this diary to track ongoing changes.
- Strengthened README hero with the drop-in MCP inspector positioning and a research-backed callout linking to `docs/whitepaper.md`.
- Expanded the footer into a full consulting CTA for contrarianAI (context audits, architecture reviews, white-paper-grade diagnostics).
- Set the GitHub repo description via `gh repo edit` (was previously empty).
- Added `docs/social-posts.md` with X thread and LinkedIn launch copy, wired to cal.com booking link.
- Added `docs/bio.md` with short/medium/long bio variants grounded in the jobsearch + Context Inspector project footprint.
- Added a top-of-README Consulting CTA section (σ collapse / bell flattening / mean drift) with 30-min discovery call booking via cal.com/kevin-luddy-0dlzuu.
- Refined the GitHub repo description to lead with the bell curve analysis framing and reference the white paper title.
