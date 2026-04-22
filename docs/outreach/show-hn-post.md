# Show HN Post — Context Inspector (re-submission)

Prior attempt on 2026-04-15 (HN #47784837) titled "AI Heartache" — URL-only submission of
`github.com/kevin-luddy39/context-inspector/` — got 1 point, 0 comments, one deleted
self-comment. Post flopped because the title carried no value prop or keyword hook.
HN scrollers decide on title alone; a cryptic label guarantees zero click-through.

The traffic data since (30 HN referrers in 14 days from /newest + Algolia drip)
confirms HN is a real but latent channel. A properly-titled re-submission is the
highest-leverage next step.

---

## Title — pick one (ranked best-to-worst)

Constraints: HN enforces 80 chars. "Show HN:" prefix is 9 chars. Leaves 71 for content.

1. **`Show HN: Context Inspector – catch AI context drift before output fails`** (67)
   — leads with the payoff ("catch before fails"), names the problem ("context drift"),
   non-jargon. Best for broad HN audience.

2. **`Show HN: Statistical early warning for AI context degradation`** (62)
   — more academic, more precise. Good for r/MachineLearning cross-post; weaker for HN.

3. **`Show HN: Bell Tuning – measure AI context distribution, not output`** (69)
   — leads with the brand. Riskier on HN; works later once the term is known.

4. **`Show HN: Watch the bell curve of your AI context window, not the answer`** (72)
   — most curious title. Worth A/B if the first attempt underperforms.

**Use #1 on the first shot.** Save #2 and #3 for a later re-post (HN allows if meaningfully
different title and 30+ days gap).

---

## URL

Two options, rank-ordered:

- **A. `https://github.com/kevin-luddy39/context-inspector`** — the repo. What the prior
  submission used. HN prefers self-hostable code over marketing pages, and the repo
  already links out to the whitepaper + landing.

- **B. `https://contrarianai-landing.onrender.com/bell-tuning`** — the manifesto page.
  Richer narrative, but HN mods dock "marketing page" submissions.

**Use A. Link the manifesto from your first-comment** (see below) — that gets you both.

---

## First comment (paste within 60 seconds of submitting)

HN ranks first-hour engagement heavily. A substantive first comment from the author
anchors the thread and prevents drive-by dismissals.

```
Author here.

The short pitch: context-window quality has a measurable distribution, and
the *shape* of that distribution degrades several steps before output
quality visibly does. We've reproduced this over a 40-turn conversation-rot
experiment (RAG Needle, r=0.999 vs ground truth precision@5). The tool
turns the measurement into an MCP server so Claude Desktop / Cursor /
Windsurf / Cline can read their own bell curve at any turn.

What this is useful for:
- Debugging "the model got worse after turn 10" without guessing
- RAG audit: is the retriever returning on-topic, diverse, non-redundant chunks?
- Multi-agent loops: spotting silent tool-call failures before the user sees them
- Long-context workflows: knowing when to re-ground vs keep going

Full write-up (math + experiment protocol + limits):
https://github.com/kevin-luddy39/context-inspector/blob/main/docs/whitepaper.md

Happy to answer anything. The limits section at §VII is probably what HN
will want to pick at first — I'd rather hear it here than in the issue tracker.
```

Why this works:
- Opens with a concrete, falsifiable claim (not branding)
- Lands the headline statistic (r=0.999) in the second paragraph
- Lists four concrete use-cases in imperative voice
- Invites the limits critique BEFORE a skeptic posts it — prevents the "this is just
  monitoring" / "this is just evals" shallow dismiss

---

## Timing

- **Day:** Tuesday or Wednesday (HN traffic is highest mid-week; engineers browse at work)
- **Time:** 7:30–9:30 AM Pacific Time (US morning = largest online HN cohort)
  - Avoid: weekends, US evenings, anything on a holiday
- **Why not today:** the current day (check the date) may already be past the
  optimum window — schedule for the next Tue/Wed morning PT.

---

## Kevin's execution checklist — do each in order

1. **Log in** to HN as `kevinluddy39` at https://news.ycombinator.com
2. **Submit** at https://news.ycombinator.com/submit
   - Title: `Show HN: Context Inspector – catch AI context drift before output fails`
   - URL: `https://github.com/kevin-luddy39/context-inspector`
   - Text: leave blank (URL-only submission)
3. **Within 60 seconds**: paste the first-comment block above.
4. **Next 2 hours — stay at keyboard.** Reply to every comment in under 10 min.
   Short, specific replies. Don't pick fights. Concede when correct.
5. **Do NOT upvote your own submission.** HN flags this and kills it.
6. **Do NOT ask friends to upvote.** HN detects vote rings in the first hour and
   dead-ranks the post.
7. **DO cross-post** the exact same content to:
   - X / Bluesky with the HN link once it's submitted (not before)
   - LinkedIn post pointing at the HN thread (not the repo — the thread)
   - `r/MachineLearning`, `r/LocalLLaMA`, `r/LangChain` — but wait 3 hours after HN
     submission and rewrite per-sub (mods remove cross-posts)

---

## If it flops (< 5 points at 2 hours)

- Don't panic-delete. Leave the submission up.
- Don't resubmit for at least 30 days and don't resubmit with the same title.
- Diagnose: was the title wrong? Was the timing wrong? Did the first-comment land?
- Options for next shot:
  - Title variant #2 or #4 above
  - Change URL to the whitepaper directly (HN sometimes rewards paper-first)
  - Write an engineering blog post *about* an unexpected result from an experiment
    and submit the blog post (not the repo) — narrative lead often outperforms
    tool-lead on HN

---

## If it hits (> 20 points at 2 hours — plausible given 198 unique cloners already)

- Keep replying. First 6 hours = rank window.
- Watch the landing page for traffic spike; capture whitepaper readers via the CTA.
- Use the comment thread as ICP intel — who are the substantive commenters?
  Check their HN profiles for company/role, flag as contacts in lead-intel dashboard.
- Prepare follow-up Show HN: one of the companion tools (retrieval-auditor is the
  strongest standalone story — r=0.999 result, concrete RAG pathology detection).
