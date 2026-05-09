const form = document.querySelector("#settingsForm");
const statusBox = document.querySelector("#statusBox");
const runButton = document.querySelector("#runButton");
const audioUpload = document.querySelector("#audioUpload");

let currentSettings;
let runInFlight = false;

async function loadSettings() {
  const response = await fetch("/api/settings");
  currentSettings = await response.json();
  fillForm(currentSettings);
  writeStatus("Settings loaded.");
}

function fillForm(settings) {
  form.postType.value = settings.postType;
  form.pipelinePhase.value = settings.pipelinePhase;
  form.contentMode.value = settings.contentMode || "auto";
  form.imageProvider.value = settings.imageProvider || "local";
  form.layoutMode.value = settings.layoutMode || "auto";
  form.slideCount.value = settings.slideCount;
  form.secondsPerSlide.value = settings.reel.secondsPerSlide;
  form.brandName.value = settings.brandName;
  form.newsPrompt.value = settings.newsPrompt;
  form.slidePrompt.value = settings.slidePrompt;
  form.imageStyle.value = settings.imageStyle;
  form.audioPath.value = settings.reel.audioPath;
  form.reelCaption.value = settings.reel.caption;
  form.carouselCaption.value = settings.carousel.caption;
}

function readForm() {
  return {
    ...currentSettings,
    postType: form.postType.value,
    pipelinePhase: form.pipelinePhase.value,
    contentMode: form.contentMode.value,
    layoutMode: form.layoutMode.value,
    slideCount: Number(form.slideCount.value),
    imageProvider: form.imageProvider.value,
    brandName: form.brandName.value,
    newsPrompt: form.newsPrompt.value,
    slidePrompt: form.slidePrompt.value,
    imageStyle: form.imageStyle.value,
    reel: {
      secondsPerSlide: Number(form.secondsPerSlide.value),
      audioPath: form.audioPath.value,
      caption: form.reelCaption.value
    },
    carousel: {
      caption: form.carouselCaption.value
    }
  };
}

function writeStatus(message, data) {
  statusBox.textContent = data ? `${message}\n\n${JSON.stringify(data, null, 2)}` : message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = readForm();
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  });
  currentSettings = await response.json();
  fillForm(currentSettings);
  writeStatus("Settings saved.", currentSettings);
});

audioUpload.addEventListener("change", async () => {
  const file = audioUpload.files?.[0];
  if (!file) return;

  const body = new FormData();
  body.append("audio", file);
  const response = await fetch("/api/audio", {
    method: "POST",
    body
  });
  const result = await response.json();
  form.audioPath.value = result.audioPath;
  writeStatus("Audio uploaded.", result);
});

runButton.addEventListener("click", async () => {
  if (runInFlight) {
    return;
  }

  runInFlight = true;
  runButton.disabled = true;
  writeStatus("Pipeline running...");
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readForm())
  });

  const poller = window.setInterval(loadLogs, 1200);

  try {
    const response = await fetch("/api/run", { method: "POST" });
    const result = await response.json();
    writeStatus(result.ok ? "Pipeline finished." : "Pipeline failed.", {
      ...result,
      logs: undefined
    });
    if (result.logs?.length) {
      statusBox.textContent = `${result.ok ? "Pipeline finished." : "Pipeline failed."}\n\n${result.logs.join("\n")}`;
    }
  } finally {
    window.clearInterval(poller);
    runInFlight = false;
    runButton.disabled = false;
    loadLogs();
  }
});

async function loadLogs() {
  const response = await fetch("/api/logs");
  const result = await response.json();
  if (result.logs?.length) {
    statusBox.textContent = result.logs.join("\n");
    statusBox.scrollTop = statusBox.scrollHeight;
  }
}

loadSettings().catch((error) => writeStatus(`Failed to load settings: ${error.message}`));
