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
  const useSearch = shouldUseGoogleSearch(options.prompt);

  const prompt = `
${options.prompt ?? `Use Google Search to find important AI and technology news stories for ${today}.`}

Return ONLY a JSON array of exactly ${options.limit} concrete content items.
Each item must fit this schema:
- title: the exact requested title, topic, command, feature, or story.
- description: specific useful details from the requested format. For cheat sheets, include the requested rows as "ITEM - short explanation" separated by semicolons.
- url: source URL if available, otherwise an empty string
- publishedAt: ISO date, best known date, or today's date if this is educational evergreen content
- source: publication, documentation site, project name, or "Generated guide" if no source URL is needed

Follow the user's requested topic, title, layout, and content type exactly.
Do not switch topics or substitute a different domain.
Avoid rumors, duplicate items, unsupported claims, clickbait, and old irrelevant results.
Target date: ${today}.
`;

  console.log("Gemini research prompt:");
  console.log(prompt.trim());
  console.log(`Gemini research Google Search: ${useSearch ? "enabled" : "disabled"}`);

  const response = await withTimeout(
    ai.models.generateContent({
      model: options.model,
      contents: prompt,
      config: useSearch
        ? { tools: [{ googleSearch: {} }] }
        : {}
    }),
    90000,
    "Gemini research"
  );

  const rawText = response.text ?? "";
  console.log("Gemini research raw response:");
  console.log(rawText);

  const items = parseJsonArray<NewsItem>(rawText, "content research");
  const parsedItems = items
    .filter(isValidNewsItem)
    .slice(0, options.limit);

  console.log("Parsed content items:");
  console.log(JSON.stringify(parsedItems, null, 2));

  return parsedItems;
}

function shouldUseGoogleSearch(prompt?: string): boolean {
  const text = prompt?.toLowerCase() ?? "";
  const asksForCurrentInfo = /\b(today|latest|current|recent|news|breaking|announced|released|this week|this month)\b/.test(text);
  const looksEvergreen = /\b(cheat[- ]?sheet|infographic|guide|tutorial|commands?|shortcuts?|syntax|examples?)\b/.test(text);

  return asksForCurrentInfo && !looksEvergreen;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
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
