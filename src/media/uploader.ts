import { v2 as cloudinary } from "cloudinary";
import type { AppConfig } from "../config/env";

export async function uploadImagesToCloudinary(
  imagePaths: string[],
  config: AppConfig
): Promise<string[]> {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are missing.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  const urls: string[] = [];

  for (const imagePath of imagePaths) {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "instagram-ai-tech-news",
      resource_type: "image",
      overwrite: true
    });

    if (!result.secure_url) {
      throw new Error(`Cloudinary did not return a secure URL for ${imagePath}.`);
    }

    urls.push(result.secure_url);
  }

  return urls;
}

export async function uploadVideoToCloudinary(
  videoPath: string,
  config: AppConfig
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are missing.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  const result = await cloudinary.uploader.upload(videoPath, {
    folder: "instagram-ai-tech-news",
    resource_type: "video",
    overwrite: true
  });

  if (!result.secure_url) {
    throw new Error(`Cloudinary did not return a secure URL for ${videoPath}.`);
  }

  return result.secure_url;
}
