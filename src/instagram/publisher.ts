import { sleep } from "../shared/sleep";

interface PublishCarouselOptions {
  businessAccountId: string;
  pageAccessToken: string;
  graphApiVersion: string;
  graphHost?: "auto" | "facebook" | "instagram";
  caption?: string;
  publishDelayMs?: number;
}

interface GraphApiResponse {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

export async function publishCarousel(
  imageUrls: string[],
  options: PublishCarouselOptions
): Promise<string> {
  if (imageUrls.length < 2) {
    throw new Error("Instagram carousel publishing requires at least 2 image URLs.");
  }

  if (imageUrls.length > 10) {
    throw new Error("Instagram carousel publishing supports at most 10 images.");
  }

  const childContainerIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const child = await postToInstagramGraph(options, `${options.businessAccountId}/media`, {
      image_url: imageUrl,
      is_carousel_item: "true"
    });

    childContainerIds.push(requireGraphId(child, "child media container"));
  }

  const carousel = await postToInstagramGraph(options, `${options.businessAccountId}/media`, {
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
    ...(options.caption ? { caption: options.caption } : {})
  });

  const carouselContainerId = requireGraphId(carousel, "carousel media container");
  await sleep(options.publishDelayMs ?? 5000);

  const published = await postToInstagramGraph(options, `${options.businessAccountId}/media_publish`, {
    creation_id: carouselContainerId
  });

  return requireGraphId(published, "published Instagram media");
}

export async function publishReel(
  videoUrl: string,
  options: PublishCarouselOptions
): Promise<string> {
  const reel = await postToInstagramGraph(options, `${options.businessAccountId}/media`, {
    media_type: "REELS",
    video_url: videoUrl,
    ...(options.caption ? { caption: options.caption } : {})
  });

  const reelContainerId = requireGraphId(reel, "Reel media container");
  await waitForContainer(options, reelContainerId);

  const published = await postToInstagramGraph(options, `${options.businessAccountId}/media_publish`, {
    creation_id: reelContainerId
  });

  return requireGraphId(published, "published Instagram Reel");
}

async function waitForContainer(
  options: PublishCarouselOptions,
  containerId: string
): Promise<void> {
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await getFromInstagramGraph(options, containerId, {
      fields: "status_code"
    });

    if (status.status_code === "FINISHED") {
      return;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Instagram Reel container failed with status: ${status.status_code}`);
    }

    await sleep(5000);
  }

  throw new Error("Instagram Reel container did not finish processing in time.");
}

async function postToInstagramGraph(
  options: PublishCarouselOptions,
  path: string,
  fields: Record<string, string>
): Promise<GraphApiResponse> {
  const host = resolveGraphHost(options);
  const url = new URL(`https://${host}/${options.graphApiVersion}/${path}`);
  const body = new URLSearchParams({
    ...fields,
    access_token: options.pageAccessToken
  });

  const response = await fetch(url, {
    method: "POST",
    body
  });

  const payload = (await response.json()) as GraphApiResponse;
  const error = payload.error;
  if (!response.ok || error) {
    const details = JSON.stringify(payload, null, 2);
    throw new Error(
      `Instagram Graph API error (${response.status}): ${error?.message ?? "Unknown error"} | payload: ${details}`
    );
  }

  return payload;
}

async function getFromInstagramGraph(
  options: PublishCarouselOptions,
  path: string,
  fields: Record<string, string>
): Promise<GraphApiResponse & { status_code?: string }> {
  const host = resolveGraphHost(options);
  const url = new URL(`https://${host}/${options.graphApiVersion}/${path}`);
  for (const [key, value] of Object.entries(fields)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", options.pageAccessToken);

  const response = await fetch(url);
  const payload = (await response.json()) as GraphApiResponse & { status_code?: string };
  const error = payload.error;
  if (!response.ok || error) {
    const details = JSON.stringify(payload, null, 2);
    throw new Error(
      `Instagram Graph API error (${response.status}): ${error?.message ?? "Unknown error"} | payload: ${details}`
    );
  }

  return payload;
}

function resolveGraphHost(options: PublishCarouselOptions): string {
  if (options.graphHost === "facebook") {
    return "graph.facebook.com";
  }

  if (options.graphHost === "instagram") {
    return "graph.instagram.com";
  }

  // Instagram Graph API publishing endpoints should generally use the Facebook Graph host.
  // Use `INSTAGRAM_GRAPH_HOST=instagram` only if your setup explicitly requires the Instagram host.
  return "graph.facebook.com";
}

function requireGraphId(response: GraphApiResponse, label: string): string {
  if (!response.id) {
    throw new Error(`Instagram Graph API did not return an id for ${label}.`);
  }

  return response.id;
}
