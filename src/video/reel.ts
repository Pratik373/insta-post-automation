import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface CreateReelVideoOptions {
  imagePaths: string[];
  outputDir?: string;
  secondsPerSlide: number;
  audioPath?: string;
}

export async function createReelVideo(options: CreateReelVideoOptions): Promise<string> {
  if (options.imagePaths.length === 0) {
    throw new Error("Cannot create a Reel video without slide images.");
  }

  const outputDir = options.outputDir ?? path.resolve(process.cwd(), "output");
  await fs.mkdir(outputDir, { recursive: true });

  const listPath = path.join(outputDir, "reel-input.txt");
  const outputPath = path.join(outputDir, "ai-news-reel.mp4");
  await fs.writeFile(listPath, buildConcatFile(options.imagePaths, options.secondsPerSlide), "utf8");

  await new Promise<void>((resolve, reject) => {
    let command = ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions([
        "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r 30",
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-movflags +faststart"
      ]);

    if (options.audioPath) {
      command = command
        .input(path.resolve(options.audioPath))
        .outputOptions(["-shortest", "-c:a aac", "-b:a 160k"]);
    }

    command
      .on("end", () => resolve())
      .on("error", reject)
      .save(outputPath);
  });

  return outputPath;
}

function buildConcatFile(imagePaths: string[], secondsPerSlide: number): string {
  const lines: string[] = [];

  for (const imagePath of imagePaths) {
    lines.push(`file '${toFfmpegPath(imagePath)}'`);
    lines.push(`duration ${secondsPerSlide}`);
  }

  lines.push(`file '${toFfmpegPath(imagePaths[imagePaths.length - 1])}'`);
  return `${lines.join("\n")}\n`;
}

function toFfmpegPath(filePath: string): string {
  return path.resolve(filePath).replace(/\\/g, "/").replace(/'/g, "'\\''");
}
