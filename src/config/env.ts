import dotenv from "dotenv";

dotenv.config({ quiet: true });

const DEFAULT_SLIDE_COUNT = 5;

export type PipelinePhase = "content" | "images" | "upload" | "publish";
export type ImageProvider = "local" | "gemini";
export type InstagramGraphHost = "auto" | "facebook" | "instagram";

export interface AppConfig {
  geminiApiKey: string;
  geminiTextModel: string;
  geminiImageModel: string;
  slideCount: number;
  pipelinePhase: PipelinePhase;
  imageProvider: ImageProvider;
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  instagram: {
    shouldPost: boolean;
    pageAccessToken?: string;
    businessAccountId?: string;
    graphApiVersion: string;
    graphHost: InstagramGraphHost;
    caption?: string;
  };
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readBoolean(name: string, defaultValue: boolean): boolean {
  const value = readOptional(name);
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function readSlideCount(): number {
  const rawValue = readOptional("SLIDE_COUNT");
  if (!rawValue) {
    return DEFAULT_SLIDE_COUNT;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error("SLIDE_COUNT must be an integer between 1 and 10.");
  }

  return parsed;
}

function readPipelinePhase(): PipelinePhase {
  const value = readOptional("PIPELINE_PHASE") ?? "content";
  if (value === "content" || value === "images" || value === "upload" || value === "publish") {
    return value;
  }

  throw new Error("PIPELINE_PHASE must be one of: content, images, upload, publish.");
}

function readImageProvider(): ImageProvider {
  const value = readOptional("IMAGE_PROVIDER") ?? "local";
  if (value === "local" || value === "gemini") {
    return value;
  }

  throw new Error("IMAGE_PROVIDER must be either local or gemini.");
}

function readInstagramGraphHost(): InstagramGraphHost {
  const value = readOptional("INSTAGRAM_GRAPH_HOST") ?? "auto";
  if (value === "auto" || value === "facebook" || value === "instagram") {
    return value;
  }

  throw new Error("INSTAGRAM_GRAPH_HOST must be one of: auto, facebook, instagram.");
}

export function getConfig(): AppConfig {
  return {
    geminiApiKey: readRequired("GEMINI_API_KEY"),
    geminiTextModel: readOptional("GEMINI_TEXT_MODEL") ?? "gemini-2.5-flash",
    geminiImageModel: readOptional("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image",
    slideCount: readSlideCount(),
    pipelinePhase: readPipelinePhase(),
    imageProvider: readImageProvider(),
    cloudinary: {
      cloudName: readOptional("CLOUDINARY_CLOUD_NAME"),
      apiKey: readOptional("CLOUDINARY_API_KEY"),
      apiSecret: readOptional("CLOUDINARY_API_SECRET")
    },
    instagram: {
      shouldPost: readBoolean("POST_TO_INSTAGRAM", false),
      pageAccessToken: readOptional("FACEBOOK_PAGE_ACCESS_TOKEN"),
      businessAccountId: readOptional("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
      graphApiVersion: readOptional("INSTAGRAM_GRAPH_API_VERSION") ?? "v24.0",
      graphHost: readInstagramGraphHost(),
      caption: readOptional("CAROUSEL_CAPTION")
    }
  };
}

export function assertCloudinaryConfig(config: AppConfig): void {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary upload requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
}

export function assertInstagramConfig(config: AppConfig): void {
  const { pageAccessToken, businessAccountId } = config.instagram;
  if (!pageAccessToken || !businessAccountId) {
    throw new Error(
      "Instagram publishing requires FACEBOOK_PAGE_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID."
    );
  }
}
