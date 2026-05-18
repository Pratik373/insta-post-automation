# PRD — Instagram AI Post Automation

| Field | Value |
|-------|-------|
| **Project Name** | Instagram AI Post Automation |
| **Owner** | Pratik (Pratik373) |
| **Document Author** | Antigravity — AI Engineering |
| **Date** | 2026-05-18 |
| **Version** | 1.0 |
| **Status** | Draft |

---

## Introduction

### Document Purpose

This PRD defines the business needs, functional requirements, and product scope for the Instagram AI Post Automation system. It serves as the foundation for ongoing development, feature prioritization, and the planning of future phases (Preview UI, Instagram Insights, Hinglish captions, Reel automation).

### Project Scope

**In Scope — Current Build (Phase 1–6):**
- AI-powered news research via Gemini
- AI-generated slide copy (headline, body, emoji, hashtag)
- Slide image generation — local Sharp renderer + Gemini image model
- Cloudinary media hosting
- Instagram carousel and Reel posting via Graph API
- Phase-gated pipeline control (`content → images → upload → publish`)
- Content caching to handle API quota limits
- Local web UI for configuration and manual runs
- Daily scheduled automation via node-cron (9:00 AM IST)

**Out of Scope — Current Phase:**
- Instagram Insights / analytics tracking (Phase 2)
- Next.js slide preview and approval UI (Phase 2)
- Hinglish caption generation (Phase 2)
- Multi-account or team support (future)
- Native mobile app (future)
- Automated Facebook Page Access Token refresh (flagged risk, not yet built)

### Audience

This document is for: the project owner (Pratik) for prioritization decisions, and any developer contributing to the codebase.

---

## Business Context

### Background / Current State

Creating daily Instagram content manually requires: researching current AI/tech news, writing slide copy, designing 1080×1920 images, uploading to Cloudinary, and posting via the Instagram app or API. This process takes significant time and is inconsistent without automation.

The project replaces the entire manual workflow with a TypeScript pipeline that uses Gemini for research, copy, and image generation — and posts directly to Instagram through the official Graph API.

### Problem Statement

> Instagram content creators focused on AI/tech need a way to publish high-quality daily carousel posts because manual content creation is time-consuming and difficult to sustain consistently. Currently, each post requires manual research, writing, design, and publishing steps.

### Business Objectives

| ID | Objective | Measurement |
|----|-----------|-------------|
| OBJ-01 | Eliminate manual content creation time for daily AI/tech posts | 0 manual steps required for a standard daily post |
| OBJ-02 | Maintain consistent daily posting without human intervention | 7 posts per week, scheduled automatically |
| OBJ-03 | Produce visually premium slides that match a professional creator aesthetic | Slide quality reviewed manually before enabling full auto-publish |
| OBJ-04 | Support multiple content formats (cheat sheets, news, stat, steps, breaking, single) | All 7 layout modes functional and selectable via UI |
| OBJ-05 | Enable safe, phase-gated pipeline control for manual review at any step | All 4 pipeline phases (`content`, `images`, `upload`, `publish`) working independently |

### Success Metrics

| Metric | Target | Measurement Method | Timeline |
|--------|--------|-------------------|----------|
| Daily pipeline reliability | Zero failed unattended runs per week | Server logs / cron output | Post-deployment |
| Slide generation quality | No regeneration needed in 90%+ of daily runs | Manual review log | Ongoing |
| API quota management | Zero pipeline failures due to Gemini quota exhaustion | Cache fallback activation rate | Monthly |
| Time saved per post | Full post produced in under 5 minutes end-to-end | Pipeline run duration log | Per run |

---

## Users & Personas

| Persona | Description | Goals | Pain Points |
|---------|-------------|-------|-------------|
| **Creator / Owner (Pratik)** | Solo Instagram content creator running an AI/tech news account | Post daily without spending time on research, design, or copy | Manual creation is slow; inconsistent posting hurts growth |
| **Developer (future contributor)** | Engineer adding features to the codebase | Understand pipeline structure and extend it cleanly | Undocumented modules, unclear phase boundaries |

---

## Product Requirements

### BR-01: AI News Research

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The system must use Gemini to research current AI and tech news stories based on a configurable topic prompt, and return structured news items for downstream processing.

**User Story:**
As a creator, I want the system to automatically find today's AI/tech stories so that I don't need to manually research content every day.

**Acceptance Criteria:**
- [ ] Gemini is called with the `newsPrompt` from settings
- [ ] Returns an array of `NewsItem` objects (title, description, url, publishedAt, source)
- [ ] Slide count is respected (fetches the configured number of items)
- [ ] Response is parsed safely; malformed JSON does not crash the pipeline
- [ ] Prompt is fully configurable from the UI or config file

**Business Rules:**
- Default prompt targets: AI, LLMs, OpenAI, Anthropic, Google DeepMind, AI chips, AI regulation
- Prompt can be overridden for any content type (cheat sheets, tutorials, etc.)

**Dependencies:** None — foundational requirement

---

### BR-02: AI Slide Copy Generation

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The system must use Gemini to transform raw news items into structured slide copy with a headline, body, emoji, and hashtag tag per slide.

**User Story:**
As a creator, I want each news story turned into punchy, Instagram-ready copy so that slides are immediately usable without editing.

**Acceptance Criteria:**
- [ ] Gemini is called with all news items and the `slidePrompt` from settings
- [ ] Returns one `SlideContent` object per slide: `headline` (ALL CAPS, 5-7 words), `body` (2-3 sentences, max 30 words), `emoji` (1 emoji), `tag` (one hashtag)
- [ ] Slide count matches the configured `slideCount`
- [ ] Response is parsed safely; pipeline does not crash on partial or malformed output
- [ ] Prompt is fully configurable from the UI or config file

**Dependencies:** BR-01

---

### BR-03: Content Caching

**Priority:** High
**Persona:** Creator / Owner

**Description:**
The system must cache the generated news items and slide copy to disk so that image regeneration runs do not re-consume Gemini API quota.

**User Story:**
As a creator, I want to re-run the image generation step without calling Gemini again so that I can iterate on slide visuals without hitting quota limits.

**Acceptance Criteria:**
- [ ] After a successful live run, news items and slide content are saved to a local cache file
- [ ] `contentMode: cache` loads from disk and skips all Gemini text API calls
- [ ] `contentMode: auto` falls back to cache automatically if Gemini returns a quota error
- [ ] Cache file includes a `savedAt` timestamp shown in logs
- [ ] Stale cache does not block a fresh live run

**Dependencies:** BR-01, BR-02

---

### BR-04: Slide Image Generation

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The system must generate a 1080×1920 image for each slide using either the local Sharp-based renderer or the Gemini image model, based on the configured `imageProvider`.

**User Story:**
As a creator, I want each slide to have a professionally designed image that matches the content type and selected visual style so that my posts look premium.

**Acceptance Criteria:**
- [ ] One JPG image is generated per slide and saved to the `output/` folder
- [ ] Local renderer supports all 7 layout modes: `auto`, `news`, `breaking`, `stat`, `steps`, `single`, `cheatsheet`
- [ ] `cheatsheet` layout renders semicolon-separated rows as a structured grid
- [ ] `steps` layout renders body sentences as numbered steps
- [ ] `stat` layout highlights a key number visually
- [ ] Image style prompt (`imageStyle` setting) is applied to Gemini image generation calls
- [ ] Brand name watermark is placed on every slide
- [ ] Slide counter badge (e.g. "1 of 5") is rendered on every slide

**Dependencies:** BR-02

---

### BR-05: Reel Video Creation

**Priority:** High
**Persona:** Creator / Owner

**Description:**
When `postType` is set to `reel`, the system must stitch all generated slide images into a single 1080×1920 MP4 video using ffmpeg, with a configurable seconds-per-slide duration and optional audio overlay.

**User Story:**
As a creator, I want to post my slides as a Reel video so that I can reach a wider audience through the Reels feed.

**Acceptance Criteria:**
- [ ] ffmpeg stitches all slide JPGs into one MP4 at 1080×1920, 30fps
- [ ] Seconds per slide is configurable (range: 2–10 seconds)
- [ ] Optional audio file path can be provided; audio is trimmed to video length
- [ ] Output video is saved to `output/ai-news-reel.mp4`
- [ ] Pipeline skips this step when `postType` is `carousel`

**Dependencies:** BR-04

---

### BR-06: Cloudinary Media Upload

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The system must upload generated slide images (carousel) or the reel video to Cloudinary and return public HTTPS URLs for use with the Instagram Graph API.

**User Story:**
As a creator, I want my generated media hosted publicly so that the Instagram API can access it when creating posts.

**Acceptance Criteria:**
- [ ] All slide JPGs are uploaded to Cloudinary when `postType` is `carousel`
- [ ] The reel MP4 is uploaded to Cloudinary when `postType` is `reel`
- [ ] Each upload returns a `secure_url` (HTTPS)
- [ ] Pipeline fails with a clear error if Cloudinary credentials are missing or invalid
- [ ] Upload step is skipped if `pipelinePhase` is `content` or `images`

**Dependencies:** BR-04, BR-05

---

### BR-07: Instagram Carousel Publishing

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The system must publish a multi-image carousel post to Instagram using the Graph API's three-step container flow.

**User Story:**
As a creator, I want each daily run to automatically publish a carousel to my Instagram account so that I maintain a consistent posting schedule.

**Acceptance Criteria:**
- [ ] Each image URL is registered as a carousel item container (`is_carousel_item: true`)
- [ ] A carousel container is created with all child container IDs
- [ ] The carousel is published via `media_publish` after a 5-second wait
- [ ] The published media ID is logged on success
- [ ] Publishing is skipped if `POST_TO_INSTAGRAM=false` or `pipelinePhase` is not `publish`
- [ ] Pipeline fails clearly if Instagram credentials are missing

**Business Rules:**
- Maximum 10 slides per carousel (Meta platform limit)
- `Plan.md` recommends 5–7 slides for engagement
- No more than 25 API-published posts per 24 hours (Meta rate limit)

**Dependencies:** BR-06

---

### BR-08: Instagram Reel Publishing

**Priority:** High
**Persona:** Creator / Owner

**Description:**
The system must publish a Reel video to Instagram when `postType` is set to `reel`, using the Graph API single-container flow for video media.

**User Story:**
As a creator, I want the option to post my daily content as a Reel instead of a carousel so that I can experiment with content format.

**Acceptance Criteria:**
- [ ] Reel video URL is registered as a video media container
- [ ] Container is published via `media_publish`
- [ ] Caption from `reel.caption` setting is applied
- [ ] Published media ID is logged on success
- [ ] Reel publishing is skipped when `postType` is `carousel`

**Dependencies:** BR-05, BR-06

---

### BR-09: Phase-Gated Pipeline Control

**Priority:** Critical
**Persona:** Creator / Owner

**Description:**
The pipeline must support four stop points so the owner can run only part of the pipeline, inspect output, and decide whether to continue.

**User Story:**
As a creator, I want to stop the pipeline after image generation and manually review slides before they are uploaded or posted so that I can catch quality issues before they go live.

**Acceptance Criteria:**
- [ ] `pipelinePhase: content` — stops after slide copy is logged; no images generated
- [ ] `pipelinePhase: images` — stops after images are saved to `output/`; no upload
- [ ] `pipelinePhase: upload` — stops after Cloudinary upload; no Instagram post
- [ ] `pipelinePhase: publish` — runs the full pipeline including posting
- [ ] `POST_TO_INSTAGRAM=false` acts as an additional safety switch at the publish step
- [ ] Current phase and all key settings are logged at the start of every run

**Dependencies:** BR-01 through BR-08

---

### BR-10: Web Control UI

**Priority:** High
**Persona:** Creator / Owner

**Description:**
A local web UI must allow the owner to view, edit, and save all automation settings, trigger pipeline runs, and view live logs — without editing config files or using the terminal.

**User Story:**
As a creator, I want a browser-based control panel so that I can change content style, trigger runs, and monitor output without using the command line.

**Acceptance Criteria:**
- [ ] Settings form displays all fields: post type, slide count, pipeline phase, content mode, image provider, layout mode, brand name, news prompt, slide prompt, image style, reel seconds per slide, audio file upload, carousel caption
- [ ] Saving settings persists to `config/automation-settings.json`
- [ ] "Run Pipeline" button triggers the full pipeline and shows live log output
- [ ] Only one pipeline run can execute at a time (409 conflict returned if already running)
- [ ] Audio file upload stores the file to the `songs/` directory and saves the path to settings
- [ ] UI is served at `http://localhost:3000` via `npm run ui`

**Dependencies:** BR-09

---

### BR-11: Daily Scheduled Automation

**Priority:** High
**Persona:** Creator / Owner

**Description:**
The system must automatically run the full pipeline daily at 9:00 AM IST using node-cron, without requiring manual intervention.

**User Story:**
As a creator, I want the pipeline to run automatically every morning so that content is posted consistently even when I'm not at my computer.

**Acceptance Criteria:**
- [ ] Cron job is configured with expression `30 3 * * *` and timezone `Asia/Kolkata`
- [ ] Each scheduled run executes `runAutomation()` with the current saved settings
- [ ] Errors are logged to the console without crashing the scheduler process
- [ ] `npm run schedule` starts the scheduler as a long-running process

**Dependencies:** BR-09

---

### BR-12: Prompt Conflict Warning

**Priority:** Medium
**Persona:** Creator / Owner

**Description:**
The system must warn the owner when the slide count setting conflicts with prompt wording that asks for a single slide.

**User Story:**
As a creator, I want to be warned if my prompt says "return one slide" but the slide count is set to more than one so that I can fix mismatched settings before wasting a run.

**Acceptance Criteria:**
- [ ] At run start, the pipeline checks if prompts contain phrases like "return one", "create one", "single slide"
- [ ] If `slideCount > 1` and such a phrase is detected, a `console.warn` message is emitted
- [ ] The pipeline does not stop — it uses the configured `slideCount`
- [ ] Warning message includes the slide count and suggests updating the prompt

**Dependencies:** BR-01, BR-02

---

## Use Cases

### UC-01: Daily Automated Post (Full Pipeline)

**Actor:** Scheduler (node-cron)
**Preconditions:** Valid credentials in `.env`, `pipelinePhase: publish`, `POST_TO_INSTAGRAM=true`, Instagram Business Account active

**Main Flow:**
1. Cron fires at 9:00 AM IST
2. System loads settings from `config/automation-settings.json`
3. Gemini researches news based on `newsPrompt`
4. Gemini generates slide copy based on `slidePrompt`
5. Content is cached to disk
6. Slide images are generated and saved to `output/`
7. Images are uploaded to Cloudinary; public URLs returned
8. Instagram carousel is published via Graph API
9. Published media ID is logged

**Alternate Flows:**
- **A1:** If Gemini quota is exhausted and `contentMode: auto`, cached content is used for steps 3–4
- **A2:** If `postType: reel`, step 6 also creates an MP4 via ffmpeg; step 7 uploads the video instead

**Error Flows:**
- **E1:** If Cloudinary credentials are missing, pipeline halts at step 7 with a clear error
- **E2:** If Instagram credentials are missing or token expired, pipeline halts at step 8 with a clear error

**Postconditions:** Instagram carousel or Reel is live; media ID is logged

---

### UC-02: Manual Run with Visual Review

**Actor:** Creator / Owner
**Preconditions:** UI running at `localhost:3000`, `pipelinePhase: images`, `POST_TO_INSTAGRAM=false`

**Main Flow:**
1. Owner opens the web UI
2. Owner sets layout mode, style, and prompts
3. Owner clicks "Run Pipeline"
4. Pipeline generates slide copy and images; stops before upload
5. Owner reviews JPGs in `output/` folder
6. If satisfied, owner changes phase to `publish` and runs again using cached content

**Alternate Flows:**
- **A1:** Owner sets `contentMode: cache` for step 6 to reuse existing slide copy without calling Gemini again

---

### UC-03: Cheat Sheet Post

**Actor:** Creator / Owner
**Preconditions:** UI running, layout mode set to `cheatsheet`

**Main Flow:**
1. Owner enters a technical topic in the news prompt (e.g., "Git commands cheat sheet")
2. Owner enters cheat-sheet slide prompt: "Return one cheat-sheet slide. Put rows in body as COMMAND - explanation; COMMAND - explanation."
3. Owner runs pipeline
4. Gemini returns structured cheat-sheet content
5. Local renderer draws a grid layout with rows parsed from semicolon-separated body text
6. Images are generated, reviewed, uploaded, and posted

---

## Non-Functional Requirements

| Category | Requirement | Target | Measurement |
|----------|-------------|--------|-------------|
| Performance | End-to-end pipeline run time | Under 5 minutes for 5–7 slides | Run duration log |
| Availability | Scheduler uptime | 99%+ when running on a server | Process monitor |
| Security | Credentials | All secrets in `.env` only, never committed | `.gitignore` enforced |
| Security | Web UI access | UI must not be exposed to the public internet | No auth layer; local-only |
| Reliability | Gemini quota handling | Pipeline never crashes on quota error if cache exists | Cache fallback activation log |
| Maintainability | Module boundaries | Each pipeline stage is a separate TypeScript module | Code review |
| Compatibility | Instagram API | Graph API version `v24.0` | `.env` configurable |
| Media quality | Slide images | 1080×1920px JPG, suitable for Instagram full-screen display | Manual visual review |

---

## Business Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BRL-01 | Maximum 10 slides per carousel run | Instagram Graph API hard limit |
| BRL-02 | Recommended 5–7 slides per post | Engagement best practice from `Plan.md` |
| BRL-03 | Maximum 25 API-published posts per 24 hours | Meta platform rate limit |
| BRL-04 | `POST_TO_INSTAGRAM` must be explicitly `true` to publish | Safety switch to prevent accidental posting |
| BRL-05 | Facebook Page Access Token must be refreshed every 60 days | Meta token expiry policy |
| BRL-06 | Instagram account must be Business or Creator type | Graph API access requirement |
| BRL-07 | Images must be hosted at public HTTPS URLs | Instagram Graph API does not accept local file paths |
| BRL-08 | Slide count is clamped to 1–10 in code | Matches Meta's carousel limit; prevents misconfiguration |

---

## Assumptions & Dependencies

### Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A01 | Instagram is a Business/Creator account | Graph API is unavailable; full replatform needed |
| A02 | Gemini API quota is sufficient for daily text + image calls | Content caching fallback must be active |
| A03 | Cloudinary free tier is sufficient for current daily usage | Paid plan upgrade needed |
| A04 | Token is refreshed manually every 60 days | Silent posting failure until token is renewed |

### Dependencies

| Dependency | Owner | Status | Risk if Unavailable |
|------------|-------|--------|---------------------|
| Gemini API (`@google/genai`) | Google / Owner API key | Active | No content generation possible |
| Cloudinary | Owner account | Active | No media hosting; Instagram posts impossible |
| Instagram Graph API | Meta / Owner account | Active | No publishing |
| Facebook Page Access Token | Owner (manual refresh) | Active, 60-day expiry | Silent posting failure on expiry |
| ffmpeg (`@ffmpeg-installer/ffmpeg`) | npm package | Installed | Reel creation unavailable |
| Sharp | npm package | Installed | Local slide image rendering unavailable |

---

## Exclusions

| Exclusion | Rationale | Future Phase? |
|-----------|-----------|---------------|
| Automated token refresh | Complexity; manual refresh is acceptable for now | Phase 2 |
| Instagram Insights / analytics | Not yet started | Phase 2 |
| Next.js slide preview/approval UI | Not yet started | Phase 2 |
| Hinglish caption generation | Not yet started | Phase 2 |
| Multi-account support | Single-account tool | Future |
| Native mobile app | Web-first approach | Future |
| Public deployment / team access | Owner-only local tool | Future |
| Slide quality auto-validation | Manual review is current workflow | Phase 2 |

---

## Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---------|------|------------|--------|------------|
| RSK-01 | Facebook Page Access Token expires silently | High (60-day cycle) | High — posting stops | Set a calendar reminder; build token refresh in Phase 2 |
| RSK-02 | Gemini API quota exhausted mid-run | Medium | Medium — content unavailable | Content cache fallback (`contentMode: auto`) handles this |
| RSK-03 | Generated slide quality is poor for a given run | Medium | Medium — bad content published | Keep `POST_TO_INSTAGRAM=false` until slides are reviewed |
| RSK-04 | Cloudinary free tier limits reached | Low | Medium — uploads fail | Monitor usage; upgrade if needed |
| RSK-05 | Meta Graph API version deprecation | Low | High — publishing breaks | `INSTAGRAM_GRAPH_API_VERSION` env var allows quick upgrade |
| RSK-06 | Local machine powers off before scheduled cron fires | High (if running locally) | High — post missed | Move to a cloud server (VPS or serverless) |

---

## Glossary

| Term | Definition |
|------|------------|
| Carousel | An Instagram post with 2–10 images swiped horizontally |
| Reel | A short-form vertical video post on Instagram |
| Pipeline Phase | A configurable stop point: `content`, `images`, `upload`, or `publish` |
| Layout Mode | The visual template used to render a slide: `news`, `breaking`, `stat`, `steps`, `single`, `cheatsheet`, `auto` |
| Content Mode | How slide content is sourced: `live` (Gemini), `cache` (disk), or `auto` (Gemini with cache fallback) |
| Image Provider | The engine used to generate slide images: `local` (Sharp renderer) or `gemini` (Gemini image model) |
| Slide Copy | The text content of a slide: headline, body, emoji, hashtag |
| Brand Name | The watermark label placed on every generated slide |
| Page Access Token | The Facebook/Instagram authentication token required for Graph API publishing; expires every 60 days |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-18 | Antigravity — AI Engineering | Initial document — full project state captured |

---

## Related Documents

- [Blueprint — Instagram AI Post Automation](./blueprint.md) — Project state mirror
- [Plan.md](../Plan.md) — Original planning document
- [LAYOUT_PROMPTS.md](../LAYOUT_PROMPTS.md) — Slide layout prompt reference
- [STYLE_PROMPTS.md](../STYLE_PROMPTS.md) — Image style preset library

---

*Antigravity — AI Engineering | 2026-05-18*
