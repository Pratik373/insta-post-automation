import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { SlideContent } from "../ai/summarizer";

interface SlidePalette {
  name: string;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accent: string;
  secondary: string;
  panel: string;
  softText: string;
}

type LayoutMode = "auto" | "news" | "breaking" | "stat" | "steps" | "single" | "cheatsheet";

interface GenerateSlidesOptions {
  apiKey: string;
  model: string;
  provider?: "local" | "gemini";
  layoutMode?: LayoutMode;
  outputDir?: string;
  brandName?: string;
  imageStyle?: string;
}

export async function generateSlideImages(
  slides: SlideContent[],
  options: GenerateSlidesOptions
): Promise<string[]> {
  if (slides.length === 0) {
    throw new Error("No slide content was available for image generation.");
  }

  const outputDir = options.outputDir ?? path.resolve(process.cwd(), "output");
  await fs.mkdir(outputDir, { recursive: true });

  if ((options.provider ?? "local") === "local") {
    return generateLocalSlideImages(
      slides,
      outputDir,
      options.brandName ?? "AI TECH DAILY",
      options.imageStyle,
      options.layoutMode ?? "auto"
    );
  }

  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const imagePaths: string[] = [];

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    const response = await ai.models.generateContent({
      model: options.model,
      contents: buildImagePrompt(
        slide,
        index + 1,
        slides.length,
        options.brandName ?? "AI TECH DAILY",
        options.imageStyle
      ),
      config: {
        responseModalities: ["Image"],
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    const imageData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data;
    if (!imageData) {
      throw new Error(`Gemini did not return image data for slide ${index + 1}.`);
    }

    const rawBuffer = Buffer.from(imageData, "base64");
    const filePath = path.join(outputDir, `slide-${String(index + 1).padStart(2, "0")}.jpg`);

    await sharp(rawBuffer)
      .resize(1080, 1920, { fit: "cover" })
      .jpeg({ quality: 92 })
      .toFile(filePath);

    imagePaths.push(filePath);
  }

  return imagePaths;
}

async function generateLocalSlideImages(
  slides: SlideContent[],
  outputDir: string,
  brandName: string,
  imageStyle?: string,
  layoutMode: LayoutMode = "auto"
): Promise<string[]> {
  const imagePaths: string[] = [];
  const palette = getPalette(imageStyle);

  console.log(`Local image style selected: ${palette.name} (${palette.accent})`);

  for (let index = 0; index < slides.length; index += 1) {
    const filePath = path.join(outputDir, `slide-${String(index + 1).padStart(2, "0")}.jpg`);
    const svg = buildSlideSvg(slides[index], index + 1, slides.length, brandName, palette, layoutMode);

    await sharp(Buffer.from(svg))
      .jpeg({ quality: 92 })
      .toFile(filePath);

    imagePaths.push(filePath);
  }

  return imagePaths;
}

function buildSlideSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette,
  layoutMode: LayoutMode
): string {
  if (layoutMode === "cheatsheet" || (layoutMode === "auto" && isCheatSheetSlide(slide))) {
    return buildCheatSheetSvg(slide, slideNumber, slideTotal, brandName, palette);
  }

  if (layoutMode === "news") {
    return buildNewsSvg(slide, slideNumber, slideTotal, brandName, palette);
  }

  if (layoutMode === "breaking") {
    return buildBreakingSvg(slide, slideNumber, slideTotal, brandName, palette);
  }

  if (layoutMode === "stat") {
    return buildStatSvg(slide, slideNumber, slideTotal, brandName, palette);
  }

  if (layoutMode === "steps") {
    return buildStepsSvg(slide, slideNumber, slideTotal, brandName, palette);
  }

  const command = extractCommand(slide);
  const example = extractCodeExample(slide.body);
  const body = removeCodeExample(slide.body, example);
  const headlineLines = wrapText(slide.headline, 16, 3);
  const bodyLines = wrapText(body, 44, 6);
  const exampleLines = example ? wrapText(example, 32, 4) : [];
  const headlineFontSize = headlineLines.length >= 3 ? 56 : 64;
  const headlineSvg = headlineLines
    .map((line, index) => textLine(line, 72, 526 + index * (headlineFontSize + 12), headlineFontSize, 900, "#ffffff"))
    .join("");
  const bodySvg = bodyLines
    .map((line, index) => textLine(line, 72, 830 + index * 44, 30, 500, "#d7e3f3"))
    .join("");
  const exampleSvg = exampleLines
    .map((line, index) => textLine(line, 102, 1248 + index * 40, 27, 700, palette.softText, "Consolas, 'Courier New', monospace"))
    .join("");

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="52%" stop-color="${palette.bgMid}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M 72 0 L 0 0 0 72" fill="none" stroke="${palette.accent}" stroke-width="1" opacity="0.11"/>
    </pattern>
    <linearGradient id="panelGlow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.04"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#grid)"/>
  <rect x="0" y="0" width="1080" height="24" fill="${palette.accent}"/>
  <rect x="0" y="24" width="1080" height="5" fill="${palette.secondary}" opacity="0.9"/>
  <path d="M746 128 C904 174 1010 316 970 498 C930 682 746 700 628 610 C510 520 534 332 626 220 C664 174 700 142 746 128Z" fill="${palette.accent}" opacity="0.12"/>
  <path d="M-40 1552 C142 1430 360 1488 438 1668 C508 1830 306 1954 92 1908 C-56 1876 -122 1668 -40 1552Z" fill="${palette.secondary}" opacity="0.08"/>
  <rect x="704" y="162" width="286" height="170" rx="18" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2" opacity="0.62"/>
  <rect x="734" y="206" width="180" height="12" rx="6" fill="${palette.accent}" opacity="0.9"/>
  <rect x="734" y="250" width="98" height="12" rx="6" fill="${palette.secondary}" opacity="0.56"/>
  <rect x="734" y="292" width="210" height="12" rx="6" fill="${palette.accent}" opacity="0.42"/>
  <rect x="72" y="82" width="172" height="58" rx="29" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(`${slideNumber} of ${slideTotal}`, 108, 122, 28, 700, palette.softText)}
  <rect x="72" y="220" width="600" height="88" rx="18" fill="url(#panelGlow)" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(escapeXml(command), 104, 276, 36, 900, palette.softText, "Consolas, 'Courier New', monospace")}
  ${textLine(escapeXml(slide.emoji), 74, 464, 92, 700, "#ffffff")}
  ${headlineSvg}
  <rect x="72" y="742" width="430" height="8" rx="4" fill="${palette.accent}" filter="url(#glow)"/>
  ${bodySvg}
  ${example ? `<rect x="72" y="1156" width="936" height="246" rx="22" fill="#050505" opacity="0.72" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine("EXAMPLE", 102, 1208, 24, 900, palette.accent)}
  ${exampleSvg}` : ""}
  <rect x="72" y="1548" width="520" height="82" rx="41" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(escapeXml(slide.tag), 112, 1602, 38, 800, palette.accent)}
  ${textLine(escapeXml(brandName), 688, 1780, 28, 800, "#8aa8bd")}
</svg>`;
}

function buildCheatSheetSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette
): string {
  const rows = extractCheatSheetRows(slide);
  const rowSvg = rows
    .slice(0, 15)
    .map((row, index) => {
      const y = 500 + index * 78;
      const command = truncate(row.command, 24);
      const description = truncate(row.description, 52);

      return `
  <rect x="62" y="${y - 44}" width="956" height="62" rx="14" fill="#070707" opacity="${index % 2 === 0 ? "0.58" : "0.36"}" stroke="${palette.accent}" stroke-width="1" stroke-opacity="0.28"/>
  ${textLine(escapeXml(command), 88, y, 28, 900, palette.softText, "Consolas, 'Courier New', monospace")}
  ${textLine("→", 386, y, 30, 900, palette.accent)}
  ${textLine(escapeXml(description), 430, y, 26, 600, "#f1f4f8")}`;
    })
    .join("");

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="52%" stop-color="${palette.bgMid}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M 64 0 L 0 0 0 64" fill="none" stroke="${palette.accent}" stroke-width="1" opacity="0.09"/>
    </pattern>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#grid)"/>
  <rect x="0" y="0" width="1080" height="26" fill="${palette.accent}"/>
  <circle cx="930" cy="218" r="250" fill="${palette.accent}" opacity="0.12"/>
  <circle cx="80" cy="1740" r="300" fill="${palette.secondary}" opacity="0.08"/>
  <rect x="62" y="82" width="170" height="58" rx="29" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(`${slideNumber} of ${slideTotal}`, 98, 122, 28, 700, palette.softText)}
  ${textLine("LINUX", 62, 250, 54, 900, palette.accent)}
  ${textLine("COMMAND CHEAT SHEET", 62, 320, 60, 900, "#ffffff")}
  <rect x="62" y="374" width="420" height="8" rx="4" fill="${palette.accent}" filter="url(#glow)"/>
  ${textLine("Fast terminal commands for daily developer, DevOps, and admin workflows.", 62, 432, 28, 600, "#d7e3f3")}
  ${rowSvg}
  ${textLine(escapeXml(brandName), 702, 1780, 28, 800, "#8aa8bd")}
</svg>`;
}

function buildNewsSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette
): string {
  const headlineLines = wrapText(slide.headline, 18, 4);
  const bodyLines = wrapText(removeCodeExample(slide.body, extractCodeExample(slide.body)), 38, 6);

  return basePosterSvg(palette, `
  ${badge(slideNumber, slideTotal, palette)}
  ${textLine("TECH NEWS", 74, 304, 42, 900, palette.accent)}
  ${textLine(escapeXml(slide.emoji), 74, 474, 118, 700, "#ffffff")}
  ${headlineLines.map((line, index) => textLine(line, 74, 590 + index * 76, 62, 900, "#ffffff")).join("")}
  <rect x="74" y="908" width="430" height="8" rx="4" fill="${palette.accent}"/>
  ${bodyLines.map((line, index) => textLine(line, 74, 1010 + index * 46, 32, 500, "#d7e3f3")).join("")}
  ${tag(slide.tag, palette)}
  ${brand(brandName)}
  `);
}

function buildBreakingSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette
): string {
  const headlineLines = wrapText(slide.headline, 15, 4);
  const bodyLines = wrapText(slide.body, 34, 5);

  return basePosterSvg(palette, `
  <rect x="0" y="170" width="1080" height="156" fill="${palette.accent}" opacity="0.96"/>
  ${textLine("BREAKING", 74, 272, 74, 900, "#050505")}
  ${badge(slideNumber, slideTotal, palette)}
  ${headlineLines.map((line, index) => textLine(line, 74, 560 + index * 82, 68, 900, "#ffffff")).join("")}
  <rect x="74" y="928" width="740" height="2" fill="${palette.accent}" opacity="0.85"/>
  ${bodyLines.map((line, index) => textLine(line, 74, 1030 + index * 50, 36, 600, "#f1f4f8")).join("")}
  ${tag(slide.tag, palette)}
  ${brand(brandName)}
  `);
}

function buildStatSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette
): string {
  const stat = extractStat(slide) ?? slide.emoji;
  const headlineLines = wrapText(slide.headline, 18, 3);
  const bodyLines = wrapText(slide.body, 38, 5);

  return basePosterSvg(palette, `
  ${badge(slideNumber, slideTotal, palette)}
  <rect x="86" y="260" width="908" height="430" rx="32" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="3"/>
  ${textLine(escapeXml(stat), 124, 538, 156, 900, palette.accent)}
  ${headlineLines.map((line, index) => textLine(line, 86, 840 + index * 76, 64, 900, "#ffffff")).join("")}
  ${bodyLines.map((line, index) => textLine(line, 86, 1138 + index * 48, 34, 500, "#d7e3f3")).join("")}
  ${tag(slide.tag, palette)}
  ${brand(brandName)}
  `);
}

function buildStepsSvg(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  palette: SlidePalette
): string {
  const steps = makeSteps(slide.body);
  const headlineLines = wrapText(slide.headline, 18, 3);

  return basePosterSvg(palette, `
  ${badge(slideNumber, slideTotal, palette)}
  ${textLine("QUICK GUIDE", 74, 278, 42, 900, palette.accent)}
  ${headlineLines.map((line, index) => textLine(line, 74, 420 + index * 72, 60, 900, "#ffffff")).join("")}
  <rect x="74" y="680" width="430" height="8" rx="4" fill="${palette.accent}"/>
  ${steps.map((step, index) => {
    const y = 830 + index * 150;
    return `<circle cx="112" cy="${y - 12}" r="34" fill="${palette.accent}"/>
  ${textLine(String(index + 1), 102, y, 32, 900, "#050505")}
  ${textLine(escapeXml(step), 176, y, 34, 700, "#f1f4f8")}`;
  }).join("")}
  ${tag(slide.tag, palette)}
  ${brand(brandName)}
  `);
}

function basePosterSvg(palette: SlidePalette, inner: string): string {
  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="52%" stop-color="${palette.bgMid}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M 72 0 L 0 0 0 72" fill="none" stroke="${palette.accent}" stroke-width="1" opacity="0.11"/>
    </pattern>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#grid)"/>
  <rect x="0" y="0" width="1080" height="24" fill="${palette.accent}"/>
  <circle cx="900" cy="286" r="288" fill="${palette.accent}" opacity="0.12"/>
  <circle cx="120" cy="1640" r="310" fill="${palette.secondary}" opacity="0.08"/>
  ${inner}
</svg>`;
}

function badge(slideNumber: number, slideTotal: number, palette: SlidePalette): string {
  return `<rect x="74" y="86" width="172" height="58" rx="29" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(`${slideNumber} of ${slideTotal}`, 110, 126, 28, 700, palette.softText)}`;
}

function tag(value: string, palette: SlidePalette): string {
  return `<rect x="74" y="1548" width="520" height="82" rx="41" fill="${palette.panel}" stroke="${palette.accent}" stroke-width="2"/>
  ${textLine(escapeXml(value), 114, 1602, 38, 800, palette.accent)}`;
}

function brand(value: string): string {
  return textLine(escapeXml(value), 688, 1780, 28, 800, "#8aa8bd");
}

function getPalette(imageStyle?: string): SlidePalette {
  const normalized = imageStyle?.toLowerCase() ?? "";

  if (
    normalized.includes("orange") ||
    normalized.includes("cyberpunk") ||
    normalized.includes("amber") ||
    normalized.includes("gold")
  ) {
    return {
      name: "orange cyberpunk",
      bgStart: "#050403",
      bgMid: "#15100c",
      bgEnd: "#2c1404",
      accent: "#ff8a1d",
      secondary: "#ffd166",
      panel: "#2c1709",
      softText: "#ffd9ad"
    };
  }

  if (normalized.includes("green") || normalized.includes("matrix")) {
    return {
      name: "green matrix",
      bgStart: "#03100b",
      bgMid: "#062015",
      bgEnd: "#10160b",
      accent: "#34f5a3",
      secondary: "#f0f66e",
      panel: "#0b2a21",
      softText: "#c8ffe8"
    };
  }

  if (normalized.includes("red") || normalized.includes("breaking")) {
    return {
      name: "red breaking",
      bgStart: "#120406",
      bgMid: "#220712",
      bgEnd: "#160a18",
      accent: "#ff3f5f",
      secondary: "#ffd166",
      panel: "#2b101b",
      softText: "#ffd6df"
    };
  }

  return {
    name: "cyan default",
    bgStart: "#050510",
    bgMid: "#0d0d2b",
    bgEnd: "#081923",
    accent: "#12d8ff",
    secondary: "#64f4ac",
    panel: "#10263b",
    softText: "#bff6ff"
  };
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines.map(escapeXml);
  }

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,;:!?]$/, "")}...`;
  return clipped.map(escapeXml);
}

function textLine(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontWeight: number,
  color: string,
  fontFamily = "Arial, Helvetica, sans-serif"
): string {
  return `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${text}</text>`;
}

function extractCommand(slide: SlideContent): string {
  const source = slide.sourceTitle?.trim();
  if (source && source.length <= 42) {
    return source;
  }

  const inlineCode = slide.body.match(/`([^`]{2,42})`/);
  if (inlineCode) {
    return inlineCode[1];
  }

  return slide.headline;
}

function extractCodeExample(body: string): string | undefined {
  const inlineCodes = [...body.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return inlineCodes.find((value) => /[-/.{}"'\\]/.test(value) || value.includes(" "));
}

function removeCodeExample(body: string, example?: string): string {
  let cleaned = body.replace(/```[\s\S]*?```/g, "").trim();
  if (example) {
    cleaned = cleaned.replace(`\`${example}\``, "the example below");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildImagePrompt(
  slide: SlideContent,
  slideNumber: number,
  slideTotal: number,
  brandName: string,
  imageStyle?: string
): string {
  return `
Create a vertical Instagram carousel slide at 1080x1920.

Visual style:
${imageStyle ?? "- Dark futuristic tech news design"}
- Use the requested accent color from the visual style, not the default cyan if another color is requested
- Dark tech gradient background
- Thin neon accent bar at the top
- Subtle grid line overlay
- Small slide counter badge in top-left: "${slideNumber} of ${slideTotal}"
- Large central visual anchor using this emoji: ${slide.emoji}
- Bold uppercase headline text: "${slide.headline}"
- Neon horizontal divider below headline
- Body copy in light gray: "${slide.body}"
- Hashtag near bottom in the accent color: "${slide.tag}"
- Small watermark bottom-right: "${brandName}"

Make the slide readable on a phone screen. Keep text inside safe margins. Avoid extra paragraphs, fake logos, website screenshots, distorted letters, or clutter.
`;
}

function isCheatSheetSlide(slide: SlideContent): boolean {
  const text = `${slide.headline} ${slide.body} ${slide.tag} ${slide.sourceTitle ?? ""}`.toLowerCase();
  return text.includes("cheat sheet") || text.includes("linux") || text.includes("command");
}

function extractCheatSheetRows(slide: SlideContent): Array<{ command: string; description: string }> {
  const base = [
    { command: extractCommand(slide), description: summarizeDescription(slide.body) }
  ];

  const linuxDefaults = [
    { command: "touch file.txt", description: "create an empty file" },
    { command: "cat file.txt", description: "print file contents" },
    { command: "cp src dest", description: "copy files or folders" },
    { command: "mv src dest", description: "move or rename files" },
    { command: "ls -la", description: "list all files with details" },
    { command: "find . -name \"*.log\"", description: "search files by name" },
    { command: "grep -i \"text\" file", description: "search text ignoring case" },
    { command: "chmod +x script.sh", description: "make a script executable" },
    { command: "chown user file", description: "change file owner" },
    { command: "df -h", description: "show disk usage" },
    { command: "du -sh folder", description: "show folder size" },
    { command: "ps aux", description: "list running processes" },
    { command: "kill -9 PID", description: "force stop a process" },
    { command: "curl -I URL", description: "check HTTP response headers" },
    { command: "ssh user@host", description: "connect to a remote server" }
  ];

  return dedupeRows([...base, ...linuxDefaults]);
}

function summarizeDescription(body: string): string {
  return removeCodeExample(body, extractCodeExample(body))
    .replace(/^`[^`]+`\s*/g, "")
    .split(/[.!?]/)[0]
    .trim()
    .toLowerCase();
}

function dedupeRows(rows: Array<{ command: string; description: string }>): Array<{ command: string; description: string }> {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.command.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function extractStat(slide: SlideContent): string | undefined {
  return `${slide.headline} ${slide.body}`.match(/\b\d+(?:\.\d+)?\s?(?:%|x|M|B|K|GB|TB|ms|s|sec|days?)\b/i)?.[0];
}

function makeSteps(body: string): string[] {
  const chunks = body
    .replace(/`([^`]+)`/g, "$1")
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const fallback = chunks.length ? chunks : [body];
  return fallback.slice(0, 5).map((item) => truncate(item, 42));
}
