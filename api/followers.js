const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 300) * 1000;

let cachedPayload = null;
let cachedAt = 0;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!instagramUserId || !accessToken) {
    return res.status(200).json({
      username: "fitup.it",
      followers: 8079,
      source: "fallback",
      configured: false,
      message: "Configure INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN in Vercel to enable real Instagram data.",
      updatedAt: new Date().toISOString()
    });
  }

  try {
    const graphUrl = new URL(`https://graph.facebook.com/v20.0/${instagramUserId}`);
    graphUrl.searchParams.set("fields", "username,followers_count");
    graphUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(graphUrl.toString());
    const data = await response.json();

    if (!response.ok || typeof data.followers_count !== "number") {
      return res.status(502).json({
        error: "Instagram Graph API error",
        details: data,
        updatedAt: new Date().toISOString()
      });
    }

    cachedPayload = {
      username: data.username || "fitup.it",
      followers: data.followers_count,
      source: "instagram_graph_api",
      configured: true,
      updatedAt: new Date().toISOString()
    };
    cachedAt = now;

    return res.status(200).json(cachedPayload);
  } catch (error) {
    return res.status(500).json({
      error: "Unable to fetch Instagram followers",
      details: error.message,
      updatedAt: new Date().toISOString()
    });
  }
}
