const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 90) * 1000;
const STALE_TTL_MS = Number(process.env.STALE_TTL_SECONDS || 900) * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6000);
const TARGET_USERNAME = process.env.INSTAGRAM_USERNAME || "fitup.it";
const SOURCE_URL = `https://instastatistics.com/${TARGET_USERNAME}`;
const FALLBACK_FOLLOWERS = Number(process.env.FALLBACK_FOLLOWERS || 8079);

let cachedPayload = null;
let cachedAt = 0;
let inFlightRequest = null;

function parseFollowersFromHtml(html) {
  const normalizedHtml = html.replace(/\s+/g, " ");

  const patterns = [
    /"followers"\s*:\s*([0-9]+)/i,
    /"followers_count"\s*:\s*([0-9]+)/i,
    /followers[^0-9]{0,80}([0-9][0-9,.]*)/i,
    /([0-9][0-9,.]*)\s*followers/i
  ];

  for (const pattern of patterns) {
    const match = normalizedHtml.match(pattern);

    if (match?.[1]) {
      const followers = Number(String(match[1]).replace(/[^0-9]/g, ""));

      if (Number.isFinite(followers) && followers > 0) {
        return followers;
      }
    }
  }

  return null;
}

function buildFallbackPayload(message = "Using fallback value.") {
  return {
    username: TARGET_USERNAME,
    followers: cachedPayload?.followers || FALLBACK_FOLLOWERS,
    source: cachedPayload ? "stale_cache" : "fallback",
    sourceUrl: SOURCE_URL,
    configured: false,
    message,
    updatedAt: new Date().toISOString()
  };
}

async function fetchFollowersFromSource() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "user-agent": "Mozilla/5.0 (compatible; FitUPCounter/1.0; +https://fitup.it)"
      }
    });

    const html = await response.text();
    const followers = parseFollowersFromHtml(html);

    if (!response.ok || !followers) {
      return buildFallbackPayload("Unable to parse follower count from Instastatistics. Serving cached or fallback value.");
    }

    return {
      username: TARGET_USERNAME,
      followers,
      source: "instastatistics",
      sourceUrl: SOURCE_URL,
      configured: true,
      updatedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const cacheAge = now - cachedAt;

  if (cachedPayload && cacheAge < CACHE_TTL_MS) {
    return res.status(200).json({
      ...cachedPayload,
      cached: true,
      cacheAgeSeconds: Math.round(cacheAge / 1000)
    });
  }

  if (inFlightRequest) {
    const payload = cachedPayload && cacheAge < STALE_TTL_MS
      ? cachedPayload
      : buildFallbackPayload("Refresh already in progress. Serving cached or fallback value.");

    return res.status(200).json({
      ...payload,
      cached: true,
      refreshInProgress: true,
      cacheAgeSeconds: Math.round(cacheAge / 1000)
    });
  }

  try {
    inFlightRequest = fetchFollowersFromSource();
    const payload = await inFlightRequest;

    cachedPayload = payload;
    cachedAt = Date.now();

    return res.status(200).json({
      ...payload,
      cached: false,
      cacheAgeSeconds: 0
    });
  } catch (error) {
    const payload = buildFallbackPayload(error.message);
    cachedPayload = payload;
    cachedAt = Date.now();

    return res.status(200).json({
      ...payload,
      cached: true,
      cacheAgeSeconds: 0
    });
  } finally {
    inFlightRequest = null;
  }
}
