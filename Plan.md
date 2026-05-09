# Instagram AI/Tech News Automation — Project Plan

## What We're Building

An automated system that:
1. Uses Gemini to research the latest AI/tech news daily
2. Uses Gemini to generate punchy slide copy
3. Uses Gemini image generation to create styled image slides (1080x1920)
4. Posts them as an Instagram carousel automatically every day

---

## Tech Stack

- **Language:** TypeScript (Node.js)
- **News Research + Querying:** Gemini API
- **AI Summarization:** Gemini API
- **Image Generation:** Gemini image generation
- **Image Hosting:** Cloudinary (Instagram Graph API needs public URLs, not local files)
- **Instagram Posting:** Instagram Graph API via Meta Developer App
- **Scheduler:** node-cron

---

## API Keys Required

| Service | Purpose | Where to get |
|---|---|---|
| Gemini API | Research AI/tech news, generate slide copy, and create slide images | Google AI Studio |
| Facebook App ID + Secret | Required wrapper for Graph API | developers.facebook.com |
| Facebook Page Access Token | Auth token for posting | Meta Graph API Explorer |
| Instagram Business Account ID | Target IG account | Meta Graph API Explorer |
| Cloudinary (Cloud Name, API Key, Secret) | Host images publicly | cloudinary.com |

> Instagram Graph API only works with a Professional account (Business or Creator), not personal.

---

## Project Folder Structure
instagram-automation/
├── src/
│   ├── index.ts              # Main runner — calls everything in order
│   ├── research/
│   │   ├── fetcher.ts        # Uses Gemini to find and return story candidates
│   │   └── types.ts          # NewsItem type definition
│   ├── ai/
│   │   └── summarizer.ts     # Calls Gemini, returns slide content per story
│   ├── design/
│   │   └── generator.ts      # Uses Gemini image generation to create JPG slides
│   ├── media/
│   │   └── uploader.ts       # Uploads JPGs to Cloudinary, returns public URLs
│   ├── instagram/
│   │   └── publisher.ts      # Posts carousel to Instagram via Graph API
│   └── scheduler/
│       └── cron.ts           # Runs the whole flow daily at 9 AM IST
├── output/                   # Temp folder for generated slide images (gitignored)
├── .env                      # All secrets — never commit this
├── .env.example              # Empty template
├── tsconfig.json
├── package.json
└── .gitignore
---

## .env File    
GEMINI_API_KEY=
FACEBOOK_PAGE_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
---

## npm Dependencies
Install TypeScript runtime dependencies plus the Gemini SDK, Cloudinary SDK, Instagram publishing helpers, and scheduler packages.

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "output"]
}
```

---

## package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "schedule": "ts-node src/scheduler/cron.ts",
    "build": "tsc"
  }
}
```

---

## What Each File Should Do

**`src/research/types.ts`**
Define a `NewsItem` interface with: `title`, `description`, `url`, `publishedAt`, `source`.

**`src/research/fetcher.ts`**
Use Gemini with a focused prompt to find current AI/tech stories for the day. Query topics like `artificial intelligence`, `LLM`, `OpenAI`, `Anthropic`, `Google DeepMind`, `AI chips`, and `AI regulation`. Return an array of `NewsItem` with source URLs when available.

**`src/ai/summarizer.ts`**
Define a `SlideContent` interface with: `headline` (5-7 words ALL CAPS), `body` (2-3 sentences max 30 words), `emoji` (1 emoji), `tag` (one hashtag).
Call Gemini with all news items in one prompt. Ask it to return a JSON array of `SlideContent`. Parse and return.

**`src/design/generator.ts`**
Use Gemini image generation to create a 1080×1920 image per slide. Prompt style:
- Dark gradient background (#050510 to #0d0d2b)
- Thin cyan accent bar at top
- Subtle grid lines overlay for tech feel
- Slide counter badge top-left (e.g. "1 of 5")
- Large emoji as visual anchor
- Bold ALL CAPS headline
- Cyan horizontal divider
- Body copy in lighter color
- Hashtag in cyan near bottom
- Brand watermark bottom-right
Save as JPG to `output/` folder.

**`src/media/uploader.ts`**
Configure Cloudinary from env vars. Upload each JPG. Return the `secure_url` for each.

**`src/instagram/publisher.ts`**
Three Graph API calls in sequence:
1. `POST /{ig-id}/media` for each image with `is_carousel_item: true` → get child container IDs
2. `POST /{ig-id}/media` with `media_type: CAROUSEL` and child IDs → get carousel container ID
3. Wait 5 seconds, then `POST /{ig-id}/media_publish` with carousel container ID

**`src/index.ts`**
Orchestrate in order: research news with Gemini → generate slide copy with Gemini → generate images with Gemini → upload to Cloudinary → post carousel.

**`src/scheduler/cron.ts`**
Use `node-cron` to run `index.ts` daily at 9 AM IST. Cron expression: `30 3 * * *`, timezone: `Asia/Kolkata`.

---

## Instagram Graph API Setup (One-Time)

1. Go to developers.facebook.com → Create App → type: Business
2. Add product: Instagram Graph API
3. Connect your Instagram Professional account
4. Go to Graph API Explorer → generate a Page Access Token
5. Exchange for a long-lived token (60 days):
   `GET https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`
6. Get your Instagram Business Account ID:
   `GET https://graph.facebook.com/me/accounts?access_token=YOUR_TOKEN`
   Then: `GET https://graph.facebook.com/{page-id}?fields=instagram_business_account&access_token=YOUR_TOKEN`
7. Put token and IG account ID in `.env`

---

## Build Order

| Phase | Build | Goal |
|---|---|---|
| 1 | fetcher + summarizer | Console log slide copy, verify Gemini output |
| 2 | image generator | Save Gemini-generated slides to disk, check visually |
| 3 | uploader | Upload one image to Cloudinary, verify URL works |
| 4 | publisher | Post one carousel manually, confirm on Instagram |
| 5 | index.ts | Wire everything end-to-end |
| 6 | cron.ts | Enable daily automation |
| 7 | Polish | Custom fonts, logo, refined layout |

---

## Key Gotchas

- Graph API does not accept local file paths — images must be public URLs. Cloudinary solves this.
- Carousel max is 10 slides. Keep to 5-7 for engagement.
- Page Access Tokens expire in 60 days — set a reminder to refresh.
- Do not exceed 25 API-published posts per 24 hours (Meta's limit).
- Gemini can return uneven image/text quality, so validate each generated slide before uploading.

---

## Future Upgrades

- Use ffmpeg to stitch slides into a 15-30s video Reel with transitions
- Add optional source verification before posting
- Build a Next.js preview UI to approve slides before posting
- Generate Hinglish captions for Hindi-speaking audience
- Track post performance via Instagram Insights API
