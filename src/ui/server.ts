import express from "express";
import multer from "multer";
import path from "node:path";
import util from "node:util";
import { runAutomation } from "../index";
import { loadSettings, normalizeSettings, saveSettings } from "../settings/settings";

const app = express();
const port = Number.parseInt(process.env.UI_PORT ?? "3000", 10);
const recentLogs: string[] = [];
let isPipelineRunning = false;
const upload = multer({
  dest: path.resolve(process.cwd(), "songs")
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.resolve(process.cwd(), "src", "ui", "public")));

app.get("/api/settings", async (_request, response) => {
  response.json(await loadSettings());
});

app.get("/api/logs", (_request, response) => {
  response.json({ logs: recentLogs });
});

app.post("/api/settings", async (request, response) => {
  const settings = normalizeSettings(request.body);
  await saveSettings(settings);
  response.json(settings);
});

app.post("/api/audio", upload.single("audio"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "No audio file uploaded." });
    return;
  }

  const originalName = request.file.originalname.replace(/[^\w.-]/g, "_");
  const finalPath = path.resolve(request.file.destination, `${Date.now()}-${originalName}`);
  await import("node:fs/promises").then((fs) => fs.rename(request.file!.path, finalPath));

  const settings = await loadSettings();
  settings.reel.audioPath = finalPath;
  await saveSettings(settings);

  response.json({ audioPath: finalPath });
});

app.post("/api/run", async (_request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (isPipelineRunning) {
    response.status(409).end(JSON.stringify({
      ok: false,
      error: "Pipeline is already running. Wait for the current run to finish.",
      logs: recentLogs
    }));
    return;
  }

  recentLogs.length = 0;
  isPipelineRunning = true;

  try {
    await captureConsoleLogs(() => runAutomation());
    response.end(JSON.stringify({ ok: true, logs: recentLogs }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(`ERROR: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    response.status(500).end(JSON.stringify({ ok: false, error: message, logs: recentLogs }));
  } finally {
    isPipelineRunning = false;
  }
});

const server = app.listen(port, () => {
  console.log(`Automation UI running at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("Automation UI server failed:", error);
});

async function captureConsoleLogs(run: () => Promise<void>): Promise<void> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: unknown[]) => {
    appendLog(formatLog(args));
    originalLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    appendLog(`WARN: ${formatLog(args)}`);
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    appendLog(`ERROR: ${formatLog(args)}`);
    originalError(...args);
  };

  try {
    await run();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function appendLog(message: string): void {
  recentLogs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
  if (recentLogs.length > 500) {
    recentLogs.shift();
  }
}

function formatLog(args: unknown[]): string {
  return args
    .map((arg) => typeof arg === "string" ? arg : util.inspect(arg, { depth: 5, colors: false }))
    .join(" ");
}
