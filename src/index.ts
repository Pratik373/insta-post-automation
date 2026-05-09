import { summarizeForSlides } from "./ai/summarizer";
import type { SlideContent } from "./ai/summarizer";
import { isQuotaError, loadContentCache, saveContentCache } from "./cache/content-cache";
import { assertCloudinaryConfig, assertInstagramConfig, getConfig } from "./config/env";
import { generateSlideImages } from "./design/generator";
import { publishCarousel, publishReel } from "./instagram/publisher";
import { uploadImagesToCloudinary, uploadVideoToCloudinary } from "./media/uploader";
import { fetchNewsItems } from "./research/fetcher";
import type { NewsItem } from "./research/types";
import { loadSettings } from "./settings/settings";
import { createReelVideo } from "./video/reel";

export async function runAutomation(): Promise<void> {
  const config = getConfig();
  const settings = await loadSettings();
  const slideCount = settings.slideCount || config.slideCount;

  const { slides } = await getPipelineContent(settings.contentMode, {
    apiKey: config.geminiApiKey,
    model: config.geminiTextModel,
    slideCount,
    newsPrompt: settings.newsPrompt,
    slidePrompt: settings.slidePrompt
  });

  console.log("Generated slide copy:");
  console.log(JSON.stringify(slides, null, 2));

  if (settings.pipelinePhase === "content") {
    console.log("pipelinePhase=content. Stopping after slide copy.");
    return;
  }

  console.log("Phase 2: generating slide images...");
  const imagePaths = await generateSlideImages(slides, {
    apiKey: config.geminiApiKey,
    model: config.geminiImageModel,
    provider: settings.imageProvider || config.imageProvider,
    brandName: settings.brandName,
    imageStyle: settings.imageStyle,
    layoutMode: settings.layoutMode
  });

  console.log("Generated local images:");
  console.log(imagePaths.join("\n"));

  let reelVideoPath: string | undefined;
  if (settings.postType === "reel") {
    console.log("Creating Reel video from slides...");
    reelVideoPath = await createReelVideo({
      imagePaths,
      secondsPerSlide: settings.reel.secondsPerSlide,
      audioPath: settings.reel.audioPath || undefined
    });

    console.log(`Generated Reel video: ${reelVideoPath}`);
  }

  if (settings.pipelinePhase === "images") {
    console.log("pipelinePhase=images. Stopping after local media generation.");
    return;
  }

  assertCloudinaryConfig(config);
  console.log("Uploading media to Cloudinary...");
  const imageUrls = settings.postType === "carousel"
    ? await uploadImagesToCloudinary(imagePaths, config)
    : [];
  const videoUrl = settings.postType === "reel" && reelVideoPath
    ? await uploadVideoToCloudinary(reelVideoPath, config)
    : undefined;

  if (settings.postType === "carousel") {
    console.log("Cloudinary image URLs:");
    console.log(imageUrls.join("\n"));
  } else {
    console.log(`Cloudinary Reel video URL:\n${videoUrl}`);
  }

  if (settings.pipelinePhase === "upload") {
    console.log("pipelinePhase=upload. Stopping after Cloudinary upload.");
    return;
  }

  if (!config.instagram.shouldPost) {
    console.log("POST_TO_INSTAGRAM is false. Skipping Instagram publish.");
    return;
  }

  assertInstagramConfig(config);
  console.log(`Phase 3: publishing Instagram ${settings.postType}...`);
  const publishOptions = {
    businessAccountId: config.instagram.businessAccountId!,
    pageAccessToken: config.instagram.pageAccessToken!,
    graphApiVersion: config.instagram.graphApiVersion,
    graphHost: config.instagram.graphHost,
    caption: settings.postType === "reel"
      ? settings.reel.caption || config.instagram.caption
      : settings.carousel.caption || config.instagram.caption
  };

  const mediaId = settings.postType === "reel"
    ? await publishReel(requireValue(videoUrl, "videoUrl"), publishOptions)
    : await publishCarousel(imageUrls, publishOptions);

  console.log(`Published Instagram media ID: ${mediaId}`);
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing required value: ${label}`);
  }

  return value;
}

async function getPipelineContent(
  contentMode: "live" | "cache" | "auto",
  options: {
    apiKey: string;
    model: string;
    slideCount: number;
    newsPrompt: string;
    slidePrompt: string;
  }
): Promise<{ newsItems: NewsItem[]; slides: SlideContent[] }> {
  if (contentMode === "cache") {
    const cached = await loadContentCache();
    if (!cached) {
      throw new Error("Content mode is cache, but no cache exists yet. Run live once after Gemini quota resets.");
    }

    console.log(`Using cached content from ${cached.savedAt}. No Gemini requests used.`);
    return {
      newsItems: cached.newsItems.slice(0, options.slideCount),
      slides: cached.slides.slice(0, options.slideCount)
    };
  }

  try {
    console.log("Phase 1: researching AI/tech news...");
    const newsItems = await fetchNewsItems({
      apiKey: options.apiKey,
      model: options.model,
      limit: options.slideCount,
      prompt: options.newsPrompt
    });

    console.log(`Found ${newsItems.length} news items.`);

    const slides = await summarizeForSlides(newsItems, {
      apiKey: options.apiKey,
      model: options.model,
      slideCount: options.slideCount,
      prompt: options.slidePrompt
    });

    await saveContentCache(newsItems, slides);
    console.log("Saved content cache for quota-free reruns.");

    return { newsItems, slides };
  } catch (error) {
    if (contentMode === "auto" && isQuotaError(error)) {
      const cached = await loadContentCache();
      if (cached) {
        console.log(`Gemini quota hit. Falling back to cached content from ${cached.savedAt}.`);
        return {
          newsItems: cached.newsItems.slice(0, options.slideCount),
          slides: cached.slides.slice(0, options.slideCount)
        };
      }
    }

    throw error;
  }
}

if (require.main === module) {
  runAutomation().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
