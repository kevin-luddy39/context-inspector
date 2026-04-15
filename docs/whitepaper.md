# Context Rot: Statistical Early Warning for AI System Degradation

**A contrarianAI Research Paper**

*Kevin Luddy — April 2026*

---

## Abstract

We demonstrate that the statistical distribution of domain alignment scores across context window chunks is a **leading indicator** of AI system failure — detectable before output quality degrades. Using a controlled experiment with constrained context windows, forced summarization, and progressive content contamination, we show that the standard deviation (σ) of the alignment bell curve signals structural degradation **3 steps before** output evaluation catches the failure. We introduce Context Inspector, an open-source, MCP-aware tool that computes these distributions in real time and surfaces the warning signal that output-only evaluation misses.

---

## 1. The Problem: Output Evaluation Is a Lagging Indicator

Most production AI systems are evaluated by checking the output. The answer looks right? Ship it. The answer looks wrong? Debug it.

This approach has a critical blind spot: **the context window can be structurally degraded while the output still appears correct.** By the time the output fails, the context has already been compromised for multiple turns — and recovery may be impossible.

We hypothesize that:
1. Context window content has a measurable statistical structure (domain alignment distribution)
2. This structure degrades in a predictable pattern before output quality degrades
3. The degradation is detectable by monitoring the shape of the alignment bell curve

## 2. Experimental Design

### 2.1 Setup

We constructed a controlled experiment using fairy tales as the knowledge domain — chosen for their universally known morals, enabling objective evaluation of lesson extraction quality.

**Base stories (3 runs):**
- The Three Little Pigs (~960 words)
- Little Red Riding Hood (~1,270 words)
- Humpty Dumpty (~480 words)

**Contamination stories (added progressively):**
- Cinderella (10 chapters)
- Christopher Columbus (10 chapters)
- The Battle of the Alamo (10 chapters)

**Context window limit:** 1,700 tokens — sized to barely hold the largest base story.

**Context management strategy:** When context exceeds the limit, drop the oldest chapter and resummarize the remaining content. This compounds two forms of information loss: eviction and compression.

### 2.2 Measurement

At each of 40 steps (10 base story chapters + 30 contamination chapters), we measured:

1. **Domain alignment per chunk:** Each chunk of the accumulated context was scored against a **frozen** set of domain terms extracted from the base story only. This means the x-axis of the bell curve always answers: "how much does this chunk look like the original story?"

2. **Bell curve statistics:** Mean (μ), standard deviation (σ), skewness, kurtosis, and histogram with Gaussian fit.

3. **Lesson extraction quality:** Claude Sonnet derived 5 lessons from the accumulated context. These were scored against ground truth via:
   - TF-IDF vector cosine similarity (automated)
   - LLM-as-judge alignment score (0.00–1.00)

### 2.3 Key Design Decision: Fixed Domain Reference

Previous approaches to context analysis compute TF-IDF terms from the entire current context. This means the "domain" shifts as contamination enters — Cinderella terms become part of the domain vocabulary, masking the drift.

We freeze the domain vocabulary at step 10 (end of base story) and hold it constant for all subsequent analysis. The bell curve now measures distance from the original domain, not distance from the evolving average.

## 3. Results

### 3.1 The Three Little Pigs — The Leading Indicator

| Step | Phase | σ | Judge Score | Status |
|:----:|-------|:---:|:---:|--------|
| 8 | Base story | 0.208 | 0.85 | Healthy |
| 9 | Base story | 0.196 | 0.75 | Healthy |
| 10 | Base story (complete) | 0.225 | 0.85 | **Baseline** |
| 11 | + Cinderella ch.1 | **0.351** | 0.85 | **σ spikes 56%. Output still passing.** |
| 12 | + Cinderella ch.2 [ROT] | 0.290 | 0.75 | σ declining. Output still passing. |
| 13 | + Cinderella ch.3 | 0.269 | 0.75 | σ declining. Output still passing. |
| 14 | + Cinderella ch.4 | 0.248 | 0.75 | σ declining. Output still passing. |
| 15 | + Cinderella ch.5 [ROT] | **0.053** | **0.00** | **Total collapse. Never recovers.** |

**The bell curve detected degradation at step 11. The output evaluation detected failure at step 15. That is 3 steps of warning** where a monitoring system watching σ would have flagged the decay while the output still appeared correct.

### 3.2 All Three Stories — Final State

| Story | Context Events | Final σ | Final Judge | Pattern |
|-------|:-:|:-:|:-:|---------|
| Three Little Pigs | 6 drop+resummarize | 0.030 | 0.00 | σ collapsed from 0.225 to 0.030 — original story completely evicted |
| Little Red Riding Hood | 7 drop+resummarize | 0.102 | 0.00 | Larger story required first ROT during base phase (step 10) |
| Humpty Dumpty | 5 drop+resummarize | 0.040 | 0.00 | Shortest story, fewest events to total collapse |

All three stories reach judge=0.00 (complete failure) and σ near zero (no original content detectable). The bell curve flattens to a line near the x-axis origin — uniform absence of the original domain.

### 3.3 The Bell Curve Tells the Story

**Healthy context (step 10):** Bell curve is tight and right-shifted. Chunks cluster at 0.5–0.9 domain alignment. σ ≈ 0.22. The system has the story.

**First contamination (step 11):** Bell curve widens. New Cinderella chunks appear near 0 on the x-axis while original story chunks remain high. Bimodal distribution emerging. σ spikes to 0.35.

**Degrading context (steps 12–14):** Bell curve flattening. After the first drop+resummarize, the summarized original loses detail. σ declining toward flat. Output still passes.

**Collapsed context (step 15+):** Bell curve is flat near zero. All chunks score low against original story terms. σ ≈ 0.05. The original story is a ghost. No recovery possible.

## 4. Implications for Production AI

### 4.1 Context Rot in Real Systems

The fairy tale experiment models what happens in production AI systems:
- **RAG pipelines** retrieve progressively less relevant documents as queries drift
- **Multi-turn conversations** accumulate off-topic content that dilutes the original context
- **Agent orchestration** generates inter-agent communication overhead that crowds out task-relevant information
- **Session resumption** from summaries loses transactional details (order numbers, dollar amounts, specific constraints)

### 4.2 Why Output Evaluation Fails

Output evaluation is a **point-in-time correctness check**. It answers: "Is this specific answer right?" It does not answer: "Is the system structurally capable of continuing to produce right answers?"

The bell curve answers the structural question. When σ spikes or the mean shifts left, the system is losing its grip on the domain — even if the current output is still correct. The next summarization, the next eviction, the next turn could be the one that breaks it.

### 4.3 The Monitoring Prescription

Production AI systems should monitor:
1. **Domain alignment σ** — trend over time, alert on sustained increase
2. **Domain alignment mean** — trend over time, alert on leftward shift
3. **Bell curve shape** — bimodal distributions indicate contamination entering the context
4. **Summarization frequency** — each summarization is a lossy compression event

These metrics can be computed cheaply (no LLM calls required — only TF-IDF and basic statistics) and checked on every turn.

## 5. The Tool: Context Inspector

Context Inspector is an open-source tool that implements the analysis described in this paper.

**Core capabilities:**
- Chunk-level domain alignment scoring against a fixed or dynamic reference
- Bell curve visualization with mean, ±1σ/±2σ bands, and individual measurement rug plot
- Statistical suite: mean, σ, skewness, kurtosis, percentiles, IQR, MAD, z-scores, trend detection
- Extended NLP: readability scores, sentiment, entropy, cosine similarity, N-grams, POS tagging, NER, LDA topics

**Integration points:**
- **MCP server** (stdio transport): add to `.mcp.json` and restart your MCP client
- **CLI**: `npx contrarianai-context-inspector <file> --domain --verbose`
- **Setup wizard**: `npx contrarianai-context-inspector --setup` — AI-guided configuration
- **Web dashboard**: `npx contrarianai-context-inspector --serve` — real-time bell curve visualization
- **HTTP API**: `POST /api/analyze` for programmatic integration

**Simulation framework:**
- 3 classic AI workflow scenarios with seeded PRNG for reproducibility
- Story-based context rot demonstration with configurable context limits
- Run comparison dashboard for evaluating different context management strategies

## 6. Conclusion

Context degradation follows predictable statistical patterns. The bell curve of domain alignment scores is a leading indicator that reveals structural decay before output quality degrades. Monitoring this signal — rather than relying solely on output evaluation — provides an early warning system for context rot in production AI.

The gap between the structural signal and the output failure is the intervention window. In our experiments, it was 3 steps. In production systems with larger context windows and slower drift, it may be dozens of turns — enough time to trigger preventive measures (context refresh, selective eviction, re-grounding) before the system fails visibly.

**The output tells you when the system has failed. The bell curve tells you when the system is about to fail.**

---

*Install: `npx contrarianai-context-inspector --setup`*

*Source: [github.com/kevin-luddy39/context-inspector](https://github.com/kevin-luddy39/context-inspector) | npm: [contrarianai-context-inspector](https://www.npmjs.com/package/contrarianai-context-inspector)*

*For the full AI Production Diagnostic: [contrarianai-landing.onrender.com](https://contrarianai-landing.onrender.com)*
