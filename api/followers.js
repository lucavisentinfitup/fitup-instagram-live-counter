const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 60) * 1000;
const TARGET_USERNAME = process.env.INSTAGRAM_USERNAME || "fitup.it";
const SOURCE_URL = `https://instastatistics.com/${TARGET_USERNAME}`;
const FALLBACK_FOLLOWERS = Number(process.env.FALLBACK_FOLLOWERS || 8079);

let cachedPayload = null;
let cachedAt = 0;

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();

  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return res.status(200).json({
      ...cachedPayload,
      cached: true
    });
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (compatible; FitUPCounter/1.0; +https://fitup.it)"
      }
    });

    const html = await response.text();
    const followers = parseFollowersFromHtml(html);

    if (!response.ok || !followers) {
      cachedPayload = {
        username: TARGET_USERNAME,
        followers: FALLBACK_FOLLOWERS,
        source: "fallback",
        sourceUrl: SOURCE_URL,
        configured: false,
        message: "Unable to parse follower count from Instastatistics. Using fallback value.",
        updatedAt: new Date().toISOString()
      };
      cachedAt = now;

      return res.status(200).json(cachedPayload);
    }

    cachedPayload = {
      username: TARGET_USERNAME,
      followers,
      source: "instastatistics",
      sourceUrl: SOURCE_URL,
      configured: true,
      updatedAt: new Date().toISOString()
    };
    cachedAt = now;

    return res.status(200).json(cachedPayload);
  } catch (error) {
    cachedPayload = {
      username: TARGET_USERNAME,
      followers: FALLBACK_FOLLOWERS,
      source: "fallback",
      sourceUrl: SOURCE_URL,
      configured: false,
      message: error.message,
      updatedAt: new Date().toISOString()
    };
    cachedAt = now;

    return res.status(200).json(cachedPayload);
  }
}
