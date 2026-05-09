import { GoogleGenAI } from "@google/genai";
import { parseJsonArray } from "../shared/json";
import type { NewsItem } from "./types";

interface FetchNewsOptions {
  apiKey: string;
  model: string;
  limit: number;
  prompt?: string;
}

export async function fetchNewsItems(options: FetchNewsOptions): Promise<NewsItem[]> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `
${options.prompt ?? `Use Google Search to find important AI and technology news stories for ${today}.`}

Return ONLY a JSON array of exactly ${options.limit} concrete content items.
Each item must fit this schema:
- title: the exact topic, command, feature, or story. For command prompts, use the command name plus syntax, not a generic collection title.
- description: specific useful details from the requested format. For command prompts, include what it does, a real-world use case, one example usage, and one pro tip.
- url: source URL if available, otherwise an empty string
- publishedAt: ISO date, best known date, or today's date if this is educational evergreen content
- source: publication, documentation site, project name, or "Generated guide" if no source URL is needed

Do not create broad roundup titles like "50 commands cheat sheet" or "guide unveiled".
Do not combine multiple unrelated commands into one item unless the user explicitly asks for a roundup.
Avoid rumors, duplicate items, unsupported claims, clickbait, and old irrelevant results.
Target date: ${today}.
`;

  const response = await ai.models.generateContent({
    model: options.model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const items = parseJsonArray<NewsItem>(response.text ?? "", "content research");
  return items
    .filter(isValidNewsItem)
    .slice(0, options.limit);
}

function isValidNewsItem(item: NewsItem): boolean {
  return Boolean(
    item &&
      item.title?.trim() &&
      item.description?.trim() &&
      item.publishedAt?.trim() &&
      item.source?.trim()
  );
}
