const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 60) * 1000;
const STALE_TTL_MS = Number(process.env.STALE_TTL_SECONDS || 900) * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6000);
const TARGET_USERNAME = process.env.INSTAGRAM_USERNAME || "fitup.it";
const SOURCE_URL = process.env.STATS_API_URL;
const FALLBACK_FOLLOWERS = Number(process.env.FALLBACK_FOLLOWERS || 8079);

let cachedPayload = null;
let cachedAt = 0;
let inFlightRequest = null;

function buildFallbackPayload(message = "Using fallback value.") {
  return {
    username: TARGET_USERNAME,
    followers: cachedPayload?.followers || FALLBACK_FOLLOWERS,
    following: cachedPayload?.following || null,
    posts: cachedPayload?.posts || null,
    avatar: cachedPayload?.avatar || null,
    source: cachedPayload ? "stale_cache" : "fallback",
    configured: false,
    message,
    updatedAt: new Date().toISOString()
  };
}

async function fetchFollowersFromSource() {
  if (!SOURCE_URL) {
    return buildFallbackPayload("STATS_API_URL is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        accept: "application/json"
      }
    });

    const data = await response.json();
    const followers = Number(data.followers);

    if (!response.ok || !Number.isFinite(followers) || followers <= 0) {
      return buildFallbackPayload("Unable to read follower count from source API.");
    }

    return {
      name: data.name || "FitUP",
      username: data.username || TARGET_USERNAME,
      followers,
      following: Number.isFinite(Number(data.following)) ? Number(data.following) : null,
      posts: Number.isFinite(Number(data.posts)) ? Number(data.posts) : null,
      avatar: data.avatar || null,
      source: "source_api",
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
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=600");

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
      : buildFallbackPayload("Refresh already in progress.");

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
