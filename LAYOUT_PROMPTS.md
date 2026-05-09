# Layout Prompt Guide

Use this file when filling the UI fields.

`News fetcher prompt` tells Gemini what content to gather or create.

`Slide copy prompt` tells Gemini how to shape that content for the selected image layout.

## Recommended Settings

For manual review, use:

```env
PIPELINE_PHASE=images
POST_TO_INSTAGRAM=false
```

Use `layoutMode` in `config/automation-settings.json` or the UI if available.

## Auto

Use when you want the app to choose a layout from the slide content.

Best for:
- mixed posts
- normal AI/tech news
- simple educational posts

Slide copy prompt:

```text
Follow the requested topic and layout exactly. Make the copy factual, readable, and energetic. If the post is a list or cheat sheet, put rows in the body as semicolon-separated ITEM - short explanation pairs. Do not switch to another topic.
```

## Cheat Sheet

Use for command lists, keyboard shortcuts, coding syntax, tools, concepts, or comparison rows.

Best for:
- SQL commands
- Linux commands
- Git commands
- Docker commands
- Python methods
- VS Code shortcuts
- AI tools list

Renderer expects the slide body to contain rows like:

```text
ITEM - short explanation; ITEM - short explanation; ITEM - short explanation
```

Slide copy prompt:

```text
Return one cheat-sheet slide. Put rows in the body as semicolon-separated ITEM - short explanation pairs. Keep each explanation short and mobile-readable. Use only the requested topic/items. Do not add unrelated commands or examples.
```

Multi-slide version:

```text
Return exactly 8 cheat-sheet slides. Split the requested items across the slides. Put rows in each body as semicolon-separated ITEM - short explanation pairs. Keep each explanation short and mobile-readable. Use only the requested topic/items. Do not add unrelated commands or examples.
```

Example:

```text
Return one cheat-sheet slide. Put rows in body as:
COMMAND - short explanation; COMMAND - short explanation.
Use only the requested SQL commands.
```

## Single

Use for one focused tip, one command, one tool, one concept, or one mini lesson per slide.

Best for:
- one SQL command per slide
- one AI tool per slide
- one coding tip per slide
- one framework concept per slide

Slide copy prompt:

```text
Return one focused slide per content item. Put the main item, command, or concept in the headline. Body should be 2 short practical sentences and may include one inline code example in backticks. Keep it clear and phone-readable.
```

## News

Use for regular technology/news update slides.

Best for:
- AI news
- product launches
- startup/funding updates
- regulation updates
- model release summaries

Slide copy prompt:

```text
Return concise news-style slides. Headline should name the specific story. Body should explain what happened and why it matters in 2 short factual sentences. Do not exaggerate, invent claims, or use clickbait.
```

## Breaking

Use for urgent, high-impact announcement style.

Best for:
- major model launches
- security incidents
- big company announcements
- policy changes
- important product releases

Slide copy prompt:

```text
Return urgent breaking-news style slides. Headline should be short, specific, and high-impact. Body should explain the key update and practical impact in 1-2 short sentences. Keep it factual and avoid hype.
```

## Stat

Use when the slide should highlight one number.

Best for:
- percentages
- benchmark scores
- market numbers
- user counts
- performance changes
- funding amounts

Slide copy prompt:

```text
Return stat-focused slides. Each headline should include or point to one important number. Body should explain what the number means and why it matters in 1-2 short sentences. Use exact numbers from the input only.
```

## Steps

Use for processes, tutorials, workflows, checklists, or how-to guides.

Best for:
- how to learn SQL
- setup guides
- debugging workflows
- prompt-writing workflow
- content creation process

Renderer turns body sentences into numbered steps.

Slide copy prompt:

```text
Return step-by-step guide slides. Body should contain 3-5 short steps as separate sentences. Each step should start with an action verb. Keep steps practical and concise.
```

## Prompt Pair Examples

### SQL Cheat Sheet

News fetcher prompt:

```text
Create one modern futuristic SQL commands infographic poster. Include SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, DROP TABLE, ALTER TABLE, WHERE, ORDER BY, GROUP BY, JOIN, COUNT, DISTINCT, LIMIT, and INDEX. Use a dark cyberpunk developer aesthetic with orange neon accents.
```

Slide copy prompt:

```text
Return one cheat-sheet slide. Put rows in body as COMMAND - short explanation; COMMAND - short explanation. Use only the requested SQL commands.
```

Multi-slide version:

```text
Return exactly 8 cheat-sheet slides. Split the requested commands across the slides. Put rows in each body as COMMAND - short explanation; COMMAND - short explanation. Use only the requested SQL commands.
```

### Git Cheat Sheet

News fetcher prompt:

```text
Create one Git commands cheat-sheet infographic for developers. Include status, add, commit, push, pull, branch, checkout, merge, rebase, log, diff, stash, clone, fetch, and reset. Use a dark terminal theme with green neon accents.
```

Slide copy prompt:

```text
Return one cheat-sheet slide. Put rows in body as COMMAND - short explanation; COMMAND - short explanation. Use only the requested Git commands.
```

Multi-slide version:

```text
Return exactly 8 cheat-sheet slides. Split the requested commands across the slides. Put rows in each body as COMMAND - short explanation; COMMAND - short explanation. Use only the requested Git commands.
```

### AI News Carousel

News fetcher prompt:

```text
Find important AI and technology news stories for today. Prioritize model launches, major product updates, AI regulation, chips, robotics, and developer tools.
```

Slide copy prompt:

```text
Return concise news-style slides. Headline should name the specific story. Body should explain what happened and why it matters in 2 short factual sentences.
```

### How-To Steps

News fetcher prompt:

```text
Create a beginner-friendly guide on how to start learning SQL for backend development.
```

Slide copy prompt:

```text
Return step-by-step guide slides. Body should contain 3-5 short steps as separate sentences. Each step should start with an action verb.
```
