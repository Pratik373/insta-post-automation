export function parseJsonArray<T>(rawText: string, label: string): T[] {
  const cleaned = extractJsonArray(stripMarkdownFence(rawText.trim()));

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error(`${label} response was JSON, but not an array.`);
    }

    return parsed as T[];
  } catch (error) {
    const preview = cleaned.slice(0, 700);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${label} JSON (${message}). Gemini returned: ${preview}`);
  }
}

function stripMarkdownFence(text: string): string {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : text;
}

function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}
