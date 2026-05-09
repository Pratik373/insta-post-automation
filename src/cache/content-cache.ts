import fs from "node:fs/promises";
import path from "node:path";
import type { SlideContent } from "../ai/summarizer";
import type { NewsItem } from "../research/types";

interface ContentCache {
  savedAt: string;
  newsItems: NewsItem[];
  slides: SlideContent[];
}

const CACHE_PATH = path.resolve(process.cwd(), "output", "cache", "last-content.json");

export async function saveContentCache(newsItems: NewsItem[], slides: SlideContent[]): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const cache: ContentCache = {
    savedAt: new Date().toISOString(),
    newsItems,
    slides
  };
  await fs.writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

export async function loadContentCache(): Promise<ContentCache | undefined> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as ContentCache;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("\"code\":429");
}
