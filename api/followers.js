const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 5000);
const STALE_TTL_MS = Number(process.env.STALE_TTL_SECONDS || 120000);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 4500);
const TARGET_USERNAME = process.env.INSTAGRAM_USERNAME || "fitup.it";
const SOURCE_URL = process.env.STATS_API_URL;
const FALLBACK_FOLLOWERS = Number(process.env.FALLBACK_FOLLOWERS || 8079);
const RETRY_AFTER_ERROR_MS = Number(process.env.RETRY_AFTER_ERROR_MS || 10000);

let cachedPayload = null;
let cachedAt = 0;
let lastErrorAt = 0;
let inFlightRequest = null;

function nowIso() {
  return new Date().toISOString();
}

function makeFallbackPayload(message = "No source data available.") {
  return {
    username: TARGET_USERNAME,
    followers: FALLBACK_FOLLOWERS,
    following: null,
    posts: null,
    avatar: null,
    source: "fallback",
    syncStatus: "fallback",
    configured: Boolean(SOURCE_URL),
    message,
    updatedAt: nowIso()
  };
}

function makeCachedPayload(message = "Serving last valid source value.") {
  if (!cachedPayload?.followers) {
    return makeFallbackPayload(message);
  }

  return {
    ...cachedPayload,
    source: "source_api_cached",
    syncStatus: "retrying",
    configured: true,
    message,
    updatedAt: nowIso()
  };
}

async function fetchFollowersFromSource() {
  if (!SOURCE_URL) {
    return makeFallbackPayload("STATS_API_URL is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(SOURCE_URL);
    url.searchParams.set("_", String(Date.now()));

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,*/*",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: `https://instastatistics.com/${TARGET_USERNAME}`,
        "user-agent": "Mozilla/5.0 (compatible; FitUPLiveCounter/1.0; +https://fitup.it)"
      }
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Source returned non JSON response with status ${response.status}`);
    }

    const followers = Number(data.followers);

    if (!response.ok || !Number.isFinite(followers) || followers <= 0) {
      throw new Error(`Invalid source response with status ${response.status}`);
    }

    return {
      name: data.name || "FitUP",
      username: data.username || TARGET_USERNAME,
      followers,
      following: Number.isFinite(Number(data.following)) ? Number(data.following) : null,
      posts: Number.isFinite(Number(data.posts)) ? Number(data.posts) : null,
      avatar: data.avatar || null,
      source: "source_api",
      syncStatus: "live",
      configured: true,
      sourceCachedAt: data.cachedAt || null,
      updatedAt: nowIso()
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const cacheAge = now - cachedAt;
  const canServeFreshCache = cachedPayload && cacheAge < CACHE_TTL_MS;
  const canServeStaleCache = cachedPayload && cacheAge < STALE_TTL_MS;
  const mustThrottleAfterError = lastErrorAt && now - lastErrorAt < RETRY_AFTER_ERROR_MS;

  if (canServeFreshCache) {
    return res.status(200).json({
      ...cachedPayload,
      cached: true,
      cacheAgeSeconds: Math.round(cacheAge / 1000)
    });
  }

  if (mustThrottleAfterError && canServeStaleCache) {
    const payload = makeCachedPayload("Source temporarily unavailable. Retrying shortly.");

    return res.status(200).json({
      ...payload,
      cached: true,
      retryAfterSeconds: Math.ceil((RETRY_AFTER_ERROR_MS - (now - lastErrorAt)) / 1000),
      cacheAgeSeconds: Math.round(cacheAge / 1000)
    });
  }

  if (inFlightRequest) {
    const payload = canServeStaleCache
      ? makeCachedPayload("Refresh already in progress.")
      : makeFallbackPayload("Refresh already in progress and no cached value is available.");

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

    if (payload.source === "source_api") {
      cachedPayload = payload;
      cachedAt = Date.now();
      lastErrorAt = 0;
    }

    return res.status(200).json({
      ...payload,
      cached: false,
      cacheAgeSeconds: 0
    });
  } catch (error) {
    lastErrorAt = Date.now();
    const payload = canServeStaleCache
      ? makeCachedPayload(error.message)
      : makeFallbackPayload(error.message);

    return res.status(200).json({
      ...payload,
      cached: true,
      cacheAgeSeconds: Math.round((Date.now() - cachedAt) / 1000)
    });
  } finally {
    inFlightRequest = null;
  }
}
