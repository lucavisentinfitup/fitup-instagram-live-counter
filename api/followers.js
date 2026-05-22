const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 90) * 1000;
const STALE_TTL_MS = Number(process.env.STALE_TTL_SECONDS || 900) * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6000);
const TARGET_USERNAME = process.env.INSTAGRAM_USERNAME || "fitup.it";
const SOURCE_URL = `https://instastatistics.com/${TARGET_USERNAME}`;
const FALLBACK_FOLLOWERS = Number(process.env.FALLBACK_FOLLOWERS || 8079);
const MIN_PLAUSIBLE_FOLLOWERS = Number(process.env.MIN_PLAUSIBLE_FOLLOWERS || 1000);

let cachedPayload = null;
let cachedAt = 0;
let inFlightRequest = null;

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseHumanNumber(value) {
  const raw = String(value).trim().toLowerCase();
  const multiplier = raw.includes('m') ? 1000000 : raw.includes('k') ? 1000 : 1;
  const cleaned = raw
    .replace(/,/g, '')
    .replace(/[^0-9.]/g, '');

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * multiplier);
}

function collectFollowerCandidates(text) {
  const candidates = [];
  const normalizedText = decodeHtmlEntities(text).replace(/\s+/g, ' ');

  const patterns = [
    /"followers"\s*:\s*"?([0-9][0-9,.]*\s*[km]?)"?/gi,
    /"followers_count"\s*:\s*"?([0-9][0-9,.]*\s*[km]?)"?/gi,
    /"followerCount"\s*:\s*"?([0-9][0-9,.]*\s*[km]?)"?/gi,
    /data-[a-z0-9_-]*followers[a-z0-9_-]*=["']([0-9][0-9,.]*\s*[km]?)["']/gi,
    /aria-label=["'][^"']*?([0-9][0-9,.]*\s*[km]?)[^"']*?followers?[^"']*["']/gi,
    /([0-9][0-9,.]*\s*[km]?)\s*followers?\b/gi,
    /followers?\b[^0-9]{0,120}([0-9][0-9,.]*\s*[km]?)/gi
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(normalizedText)) !== null) {
      const followers = parseHumanNumber(match[1]);

      if (Number.isFinite(followers)) {
        candidates.push(followers);
      }
    }
  }

  return candidates;
}

function parseFollowersFromHtml(html) {
  const candidates = collectFollowerCandidates(html)
    .filter((value) => value >= MIN_PLAUSIBLE_FOLLOWERS && value < 1000000000);

  if (!candidates.length) {
    return null;
  }

  const exactCandidates = candidates.filter((value) => value % 100 !== 0);

  if (exactCandidates.length) {
    return exactCandidates.sort((a, b) => b - a)[0];
  }

  return candidates.sort((a, b) => b - a)[0];
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
      return buildFallbackPayload("Unable to parse a plausible follower count from Instastatistics. Serving cached or fallback value.");
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
