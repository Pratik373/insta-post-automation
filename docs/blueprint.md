# Blueprint — Instagram AI Post Automation

| Field | Description |
|-------|-------------|
| **Project Name** | Instagram AI Post Automation |
| **Owner** | Pratik (Pratik373) |
| **Document Author** | Antigravity — AI Engineering |
| **Date / Version** | 2026-05-18 / v1.0 |
| **Status** | DRAFT — Reflects current project state |

---

## Key Principle

> This Blueprint reflects **what has been built and what has been planned**, drawn directly from project source materials. It organizes what exists, identifies gaps, and surfaces open questions. It contains no external recommendations or invented requirements.

---

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Project Name** | Instagram AI Post Automation |
| **Repository** | `Pratik373/insta-post-automation` |
| **Engagement Type** | Personal / Creator Tool — Production |
| **Current Phase** | Active Development — Core pipeline working, extensions in progress |
| **Primary Language** | TypeScript (Node.js) |
| **Source Materials** | `Plan.md`, `README.md`, `LAYOUT_PROMPTS.md`, `STYLE_PROMPTS.md`, `package.json`, `.env.example`, `config/automation-settings.json`, all `src/` modules |

---

## Problem Statement (As Understood)

### What the project says:
> "An automated system that: uses Gemini to research the latest AI/tech news daily, uses Gemini to generate punchy slide copy, uses Gemini image generation to create styled image slides (1080×1920), posts them as an Instagram carousel automatically every day."
> — `Plan.md`

### Our understanding:
The owner runs (or wants to run) an Instagram account focused on AI and tech content. Creating carousel posts manually — researching news, writing copy, designing slides, and uploading — is time-consuming and inconsistent. This project fully automates that workflow end-to-end using AI at every step, scheduled to run once per day at 9:00 AM IST.

### Gaps:
- [ ] The target Instagram account name and audience profile are not documented
- [ ] No stated follower count or engagement targets at this stage

---

## Client's Stated Vision

From `Plan.md` and README:

- A **daily automated pipeline** that generates AI/tech news content and posts it to Instagram without human intervention.
- **Gemini at every stage** — news research, slide copy writing, and image generation.
- **Cloudinary** as a public image host (Instagram Graph API requires public URLs, not local file paths).
- A **phase-gated pipeline** (`content → images → upload → publish`) so the owner can stop and inspect output at any stage before going live.
- A **local web UI** (Express + vanilla JS) to configure and trigger runs without editing files or using the terminal.
- **Future plans stated in `Plan.md`:**
  - Reel video via ffmpeg with slide transitions (partially built)
  - Next.js slide preview/approval UI before posting
  - Hinglish captions for Hindi-speaking audiences
  - Instagram Insights API tracking for post performance

---

## Source Material Summary

| Material | Type | Summary | Key Information |
|----------|------|---------|-----------------|
| `Plan.md` | Planning doc | Full project blueprint written at project start | Tech stack, folder structure, build phases, API keys required, gotchas, future upgrades |
| `README.md` | Developer doc | Setup guide and pipeline phase reference | npm install, env setup, `PIPELINE_PHASE` values, cron schedule details |
| `LAYOUT_PROMPTS.md` | Prompt library | 7 slide layout types with recommended prompts | Auto, Cheat Sheet, Single, News, Breaking, Stat, Steps — with example prompt pairs for each |
| `STYLE_PROMPTS.md` | Prompt library | 12 named image style presets | Pink Neon Cyberpunk, Orange, Blue AI Newsroom, Green Matrix, Red Alert, Purple SaaS, White Minimal, Gold Finance, Cybersecurity, Developer Terminal, Cloud Dashboard, Robotics Lab |
| `package.json` | Config | npm dependency list | `@google/genai`, `cloudinary`, `express`, `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, `node-cron`, `sharp`, `multer` |
| `.env.example` | Config template | All required environment variables | Gemini API key, Cloudinary credentials, Facebook Page Access Token, Instagram Business Account ID, `POST_TO_INSTAGRAM`, `PIPELINE_PHASE`, `IMAGE_PROVIDER`, `SLIDE_COUNT`, model override names |
| `config/automation-settings.json` | Runtime config | Persisted UI settings file | Post type, slide count, pipeline phase, content mode, image provider, layout mode, brand name, news prompt, slide prompt, image style, reel and carousel captions |
| `src/index.ts` | Orchestrator | Main pipeline runner — 222 lines | Loads settings → fetches news → summarizes slides → generates images → optionally creates reel video → uploads to Cloudinary → posts to Instagram |
| `src/research/fetcher.ts` | Module | News fetching via Gemini | Calls Gemini text model with a configurable topic prompt; returns `NewsItem[]` |
| `src/research/types.ts` | Types | NewsItem interface | Fields: `title`, `description`, `url`, `publishedAt`, `source` |
| `src/ai/summarizer.ts` | Module | Slide copy generation | Calls Gemini with all news items; returns `SlideContent[]` with `headline`, `body`, `emoji`, `tag` |
| `src/design/generator.ts` | Module | Slide image generation — 24KB | Local Sharp-based rendering AND Gemini image generation; supports 7 layout renderers: news, breaking, stat, steps, single, cheatsheet, auto |
| `src/media/uploader.ts` | Module | Cloudinary upload | Uploads JPGs (carousel) or MP4 (reel); returns public `secure_url` values |
| `src/instagram/publisher.ts` | Module | Instagram Graph API posting | Three-step carousel flow (create items → create container → publish); single-step reel upload |
| `src/video/reel.ts` | Module | Reel video creation via ffmpeg | Stitches slide images into 1080×1920 MP4 at 30fps; supports optional background audio overlay |
| `src/scheduler/cron.ts` | Module | Daily automation | `node-cron` expression `30 3 * * *` = 9:00 AM IST, timezone `Asia/Kolkata` |
| `src/settings/settings.ts` | Module | Settings management | Load/save/normalize `automation-settings.json`; defines `AutomationSettings`, `PostType`, `ContentMode`, `LayoutMode` types |
| `src/cache/content-cache.ts` | Module | Content caching | Saves and loads Gemini text output to disk so reruns don't consume API quota |
| `src/ui/server.ts` | Module | Web UI backend (Express, port 3000) | REST API: `GET /api/settings`, `POST /api/settings`, `POST /api/run`, `POST /api/audio`, `GET /api/logs` |
| `src/ui/public/` | Module | Web UI frontend | `index.html`, `styles.css`, `app.js` — vanilla JS control panel for triggering and configuring pipeline runs |
| `src/shared/` | Module | Shared utilities | `json.ts` (safe JSON parsing), `sleep.ts` (async delay helper) |

---

## Assumptions

| ID | Assumption | Source | Risk if Wrong |
|----|------------|--------|---------------|
| A01 | Instagram account is a Business or Creator account (Graph API requirement) | `Plan.md` note | Pipeline cannot post — Graph API is blocked for personal accounts |
| A02 | Gemini API has sufficient daily quota for text + image generation | `.env.example`, `Plan.md` | Cache fallback (`contentMode: cache`) exists to handle quota exhaustion |
| A03 | Cloudinary free tier is sufficient for current daily upload volume | `Plan.md` | May need a paid plan if posting frequency or media size increases |
| A04 | Facebook Page Access Token is refreshed manually every 60 days | `Plan.md` gotchas | Token expiry silently breaks all posting with no automatic alert |
| A05 | `local` image provider (Sharp-based renderer) is the primary daily-use path | `config/automation-settings.json` (`imageProvider: "local"`) | Gemini image generation is available as an alternative provider |
| A06 | Carousel posts are the primary post type; Reel is a secondary feature | `config/automation-settings.json` (`postType: "carousel"`) | Reel pipeline is fully built but not the primary daily output |
| A07 | Slide count is capped at 10, matching Instagram's carousel limit | `settings.ts` `clampInteger` | Enforced in code; aligns with Meta platform rules |
| A08 | The web UI is used locally by the owner only and requires no authentication | `src/ui/server.ts` | Express routes have no auth; the server must not be exposed to the public internet |

---

## Open Questions

### Tier 1: Critical (Affects Production Reliability)

| ID | Category | Question | Impact |
|----|----------|----------|--------|
| Q1 | Auth | Is there a plan to automatically refresh the 60-day Facebook Page Access Token? | Expiry causes silent posting failure with no alert or fallback |
| Q2 | Quality | Should the system validate generated slide quality before auto-posting, or is manual `POST_TO_INSTAGRAM=false` review the permanent workflow? | Defines whether fully unattended daily automation is safe |
| Q3 | Quota | Has Gemini API quota been consistently sufficient for daily text + image generation runs? | Determines if content cache fallback is a safety net or a daily dependency |

### Tier 2: Important (Affects Roadmap Sequencing)

| ID | Category | Question | Impact |
|----|----------|----------|--------|
| Q4 | UI | Is the local web UI (`npm run ui`) being used regularly, or is direct config file editing the norm? | Determines UI development investment priority |
| Q5 | Reel | Is Reel posting working end-to-end in production, or is it still untested? | Affects Phase 6 completion status and roadmap |
| Q6 | Analytics | Are specific engagement benchmarks being tracked for the Instagram account? | Informs Instagram Insights API integration priority |
| Q7 | Infrastructure | Is this running on a local machine (manual trigger) or a cloud server (fully automated)? | Impacts cron scheduler reliability and unattended operation |

### Tier 3: Nice to Have

| ID | Category | Question | Impact |
|----|----------|----------|--------|
| Q8 | Design | Are there official brand assets (logo file, color hex codes, specific font) to embed in generated slides? | Affects brand watermark quality and slide design consistency |
| Q9 | Content | Is Hinglish caption generation a near-term priority or a later phase? | Determines Phase 2 scope |
| Q10 | Preview | Should the Next.js approval UI be built before or after full automation is stable? | Roadmap sequencing decision |

---

## Gap Analysis

```
Area                         Known    Gaps     Status
──────────────────────────────────────────────────────────
Core Pipeline (text + image) 95%      5%       ✅ Built and working
Instagram Carousel Posting   80%      20%      ⚠️  Token refresh not automated (Q1)
Reel Generation              85%      15%      ⚠️  Built; production test status unclear (Q5)
Web Control UI               90%      10%      ✅ Functional; minor UX gaps
Content Quality Control      60%      40%      🔴 Manual review only; no auto-validation
Token / Auth Management      40%      60%      🔴 60-day expiry has no automated handling (Q1)
Scheduling / Infrastructure  70%      30%      ⚠️  Cron built; server vs. local unclear (Q7)
Brand Identity in Slides     50%      50%      ⚠️  Watermark placeholder exists; no formal assets (Q8)
Instagram Analytics          0%       100%     🔴 Not started — future phase
Preview / Approval UI        0%       100%     🔴 Not started — future phase
Hinglish Captions            0%       100%     🔴 Not started — future phase
```

---

## Contradictions

| Issue | Contradiction | Sources | Resolution Needed |
|-------|---------------|---------|-------------------|
| Image provider | `Plan.md` positions Gemini image generation as the primary image method; `config/automation-settings.json` uses `imageProvider: "local"` (Sharp-based renderer) as the active setting | `Plan.md`, `config/automation-settings.json` | Confirm which is the intended daily production method |
| Pipeline phase default | `.env.example` defaults `PIPELINE_PHASE=content` (safe, stops early); `config/automation-settings.json` has `pipelinePhase: "publish"` (full run, posts to Instagram) | `.env.example`, `config/automation-settings.json` | The JSON file overrides the env at runtime; this is intentional but not documented anywhere |
| Slide count | `Plan.md` recommends 5-7 slides for engagement; settings currently uses `slideCount: 6`; env default is `SLIDE_COUNT=5` | `Plan.md`, `config/automation-settings.json`, `.env.example` | Minor — JSON settings override env default at runtime; all values are within the recommended range |

---

## Next Steps

1. **Answer Q1** — Design a 60-day token refresh reminder system or automate the long-lived token exchange
2. **Answer Q5** — Run and validate the Reel pipeline end-to-end in a controlled test
3. **Answer Q7** — Decide: local machine with manual trigger vs. cloud server with always-on cron
4. **Move to PRD** — Use the PRD document to formally scope the next development phase (Preview UI, Instagram Insights, Hinglish captions)

---

## Related Documents

- [PRD — Instagram AI Post Automation](./prd.md) — Formal product requirements for the next phase
- [Plan.md](../Plan.md) — Original project planning document
- [LAYOUT_PROMPTS.md](../LAYOUT_PROMPTS.md) — Slide layout prompt reference
- [STYLE_PROMPTS.md](../STYLE_PROMPTS.md) — Image style preset library

---

*Antigravity — AI Engineering | 2026-05-18*
