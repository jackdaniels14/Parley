import {onCall, HttpsError} from "firebase-functions/v2/https";

const OEMBED_ENDPOINTS: Record<string, string> = {
  youtube: "https://www.youtube.com/oembed",
  tiktok: "https://www.tiktok.com/oembed",
  twitter: "https://publish.twitter.com/oembed",
};

function detectPlatform(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host === "tiktok.com") return "tiktok";
    if (host === "twitter.com" || host === "x.com") return "twitter";
    if (host === "instagram.com") return "instagram";
    return null;
  } catch {
    return null;
  }
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  html?: string;
}

export const fetchOEmbed = onCall(async (request) => {
  const {url} = request.data as {url: string};

  if (!url || typeof url !== "string") {
    throw new HttpsError("invalid-argument", "url is required");
  }

  const platform = detectPlatform(url);
  if (!platform) {
    throw new HttpsError(
      "invalid-argument",
      "Unsupported URL. Supported platforms: YouTube, TikTok, Twitter/X, Instagram"
    );
  }

  // Instagram: no programmatic embed available, return link-out only
  if (platform === "instagram") {
    return {
      platform: "instagram",
      title: "",
      authorName: "",
      thumbnailUrl: null,
      embedHtml: null,
    };
  }

  const endpoint = OEMBED_ENDPOINTS[platform];
  const oembedUrl = `${endpoint}?url=${encodeURIComponent(url)}&format=json`;

  try {
    const resp = await fetch(oembedUrl, {
      headers: {"User-Agent": "Parley/1.0 (https://parlay-8eba6.web.app)"},
    });

    if (!resp.ok) {
      throw new HttpsError(
        "not-found",
        "Could not fetch embed data. The content may be private or unavailable."
      );
    }

    const data = (await resp.json()) as OEmbedResponse;

    return {
      platform,
      title: data.title || "",
      authorName: data.author_name || "",
      thumbnailUrl: data.thumbnail_url || null,
      embedHtml: data.html || null,
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "Failed to fetch embed data");
  }
});
