import type { YouTubeMetadata } from "./types";

export function extractYouTubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0]?.slice(0, 11);
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v")?.slice(0, 11) || undefined;
      }

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") {
        return parts[1]?.slice(0, 11);
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const videoId = extractYouTubeVideoId(url);

  if (videoId && process.env.YOUTUBE_API_KEY) {
    const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    apiUrl.searchParams.set("part", "snippet");
    apiUrl.searchParams.set("id", videoId);
    apiUrl.searchParams.set("key", process.env.YOUTUBE_API_KEY);

    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      const item = data.items?.[0];
      if (item?.snippet) {
        return {
          title: item.snippet.title,
          description: item.snippet.description,
          channelName: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails?.maxres?.url ||
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url,
          videoId,
          isLimited: false
        };
      }
    }
  }

  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("url", url);
  oembedUrl.searchParams.set("format", "json");

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    return {
      title: videoId ? `YouTube 레시피 (${videoId})` : "YouTube 레시피",
      videoId,
      isLimited: true
    };
  }

  const data = await response.json();
  return {
    title: data.title || "YouTube 레시피",
    channelName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
    videoId,
    isLimited: true
  };
}
