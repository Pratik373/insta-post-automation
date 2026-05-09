import { GoogleGenAI } from "@google/genai";
import { parseJsonArray } from "../shared/json";
import type { NewsItem } from "../research/types";

export interface SlideContent {
  headline: string;
  body: string;
  emoji: string;
  tag: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

interface SummarizeOptions {
  apiKey: string;
  model: string;
  slideCount: number;
  prompt?: string;
}

export async function summarizeForSlides(
  newsItems: NewsItem[],
  options: SummarizeOptions
): Promise<SlideContent[]> {
  if (newsItems.length === 0) {
    throw new Error("No news items were available to summarize.");
  }

  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const prompt = `
Turn these content items into exactly ${options.slideCount} Instagram carousel slides.

Rules:
- Return ONLY a JSON array.
- The first character must be [ and the last character must be ].
- Do not include markdown, commentary, notes, or extra text after the JSON.
- headline: 3-8 words, ALL CAPS, no period
- body: 2-3 practical sentences, maximum 42 words total
- emoji: exactly one relevant emoji
- tag: exactly one relevant hashtag
- sourceTitle: copy the original story title
- sourceUrl: copy the original source URL
- Make the copy factual, readable, and energetic.
- Do not invent facts beyond the input items.
- Follow the user's requested topic, title, layout, and content type exactly.
- If the user asks for a cheat sheet, infographic, roundup, or list, the body may contain compact semicolon-separated rows in this format: ITEM - short explanation.
- If the user asks for one item per slide, put the item name or syntax in the headline and include a concrete example in the body.
- Do not switch topics. For example, never turn SQL into Linux, Git into Docker, or a framework prompt into generic AI news.
- Do not write generic collection copy like "50+ commands", "cheat sheet unveiled", "unlock powerful commands", or "master commands".
${options.prompt ?? ""}

Content items:
${JSON.stringify(newsItems.slice(0, options.slideCount), null, 2)}
`;

  console.log("Gemini slide-copy prompt:");
  console.log(prompt.trim());

  const response = await ai.models.generateContent({
    model: options.model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const rawText = response.text ?? "";
  console.log("Gemini slide-copy raw response:");
  console.log(rawText);

  const slides = parseJsonArray<SlideContent>(rawText, "slide copy");
  const parsedSlides = slides
    .filter(isValidSlideContent)
    .slice(0, options.slideCount)
    .map(normalizeSlide);

  console.log("Parsed slide copy:");
  console.log(JSON.stringify(parsedSlides, null, 2));

  return parsedSlides;
}

function isValidSlideContent(slide: SlideContent): boolean {
  return Boolean(
    slide &&
      slide.headline?.trim() &&
      slide.body?.trim() &&
      slide.emoji?.trim() &&
      slide.tag?.trim()
  );
}

function normalizeSlide(slide: SlideContent): SlideContent {
  return {
    ...slide,
    headline: slide.headline.trim().toUpperCase(),
    body: slide.body.trim(),
    emoji: slide.emoji.trim(),
    tag: slide.tag.trim().startsWith("#") ? slide.tag.trim() : `#${slide.tag.trim()}`
  };
}
