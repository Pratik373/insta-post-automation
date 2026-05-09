import fs from "node:fs/promises";
import path from "node:path";

export type PostType = "carousel" | "reel";
export type ContentMode = "live" | "cache" | "auto";
export type LayoutMode = "auto" | "news" | "breaking" | "stat" | "steps" | "single" | "cheatsheet";

export interface AutomationSettings {
  postType: PostType;
  slideCount: number;
  pipelinePhase: "content" | "images" | "upload" | "publish";
  contentMode: ContentMode;
  imageProvider: "local" | "gemini";
  layoutMode: LayoutMode;
  brandName: string;
  newsPrompt: string;
  slidePrompt: string;
  imageStyle: string;
  reel: {
    secondsPerSlide: number;
    audioPath: string;
    caption: string;
  };
  carousel: {
    caption: string;
  };
}

const SETTINGS_PATH = path.resolve(process.cwd(), "config", "automation-settings.json");

export async function loadSettings(): Promise<AutomationSettings> {
  const raw = await fs.readFile(SETTINGS_PATH, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as AutomationSettings;
}

export async function saveSettings(settings: AutomationSettings): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, `${JSON.stringify(normalizeSettings(settings), null, 2)}\n`, "utf8");
}

export function normalizeSettings(settings: AutomationSettings): AutomationSettings {
  return {
    postType: settings.postType === "carousel" ? "carousel" : "reel",
    slideCount: clampInteger(settings.slideCount, 1, 10, 5),
    pipelinePhase: normalizePhase(settings.pipelinePhase),
    contentMode: normalizeContentMode(settings.contentMode),
    imageProvider: settings.imageProvider === "gemini" ? "gemini" : "local",
    layoutMode: normalizeLayoutMode(settings.layoutMode),
    brandName: settings.brandName?.trim() || "AI NEWS UPDATES",
    newsPrompt: settings.newsPrompt?.trim() || "Find important AI and technology news stories for today.",
    slidePrompt: settings.slidePrompt?.trim() || "Make the copy factual, readable, and energetic.",
    imageStyle: settings.imageStyle?.trim() || "Dark futuristic tech news design with cyan accents.",
    reel: {
      secondsPerSlide: clampInteger(settings.reel?.secondsPerSlide, 2, 10, 3),
      audioPath: settings.reel?.audioPath?.trim() || "",
      caption: settings.reel?.caption?.trim() || ""
    },
    carousel: {
      caption: settings.carousel?.caption?.trim() || ""
    }
  };
}

function normalizePhase(value: AutomationSettings["pipelinePhase"]): AutomationSettings["pipelinePhase"] {
  return value === "content" || value === "images" || value === "upload" || value === "publish"
    ? value
    : "upload";
}

function normalizeContentMode(value: ContentMode): ContentMode {
  return value === "live" || value === "cache" || value === "auto" ? value : "auto";
}

function normalizeLayoutMode(value: LayoutMode): LayoutMode {
  return value === "news" ||
    value === "breaking" ||
    value === "stat" ||
    value === "steps" ||
    value === "single" ||
    value === "cheatsheet" ||
    value === "auto"
    ? value
    : "auto";
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}
