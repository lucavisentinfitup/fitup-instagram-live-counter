// Follower Instagram dall'API ufficiale (Instagram Graph API), senza scraping.
//
//   GET /api/followers                       account principale (fitup.it)
//   GET /api/followers?username=fitup_lecco  un altro account Business/Creator (business discovery)
//   GET /api/followers?username=...&demografia=1
//                                            in più genere ed età dei follower (follower_demographics), solo per gli
//                                            account che il token gestisce (stesso Business Manager di FitUP)
//
// Variabili d'ambiente (Vercel → Settings → Environment Variables):
//   INSTAGRAM_ACCESS_TOKEN  token di lunga durata (utente di sistema del Business Manager) con instagram_basic,
//                           instagram_manage_insights, pages_show_list, pages_read_engagement, business_management
//   INSTAGRAM_USER_ID       ID dell'account Instagram Business di fitup.it (non la pagina Facebook)
//   INSTAGRAM_USERNAME      default fitup.it
//   ALLOWED_USERNAMES       espressione regolare degli account interrogabili (default ^fitup[._a-z0-9]*$): l'endpoint è
//                           pubblico e non deve consumare il limite di chiamate per account qualsiasi
//   CACHE_TTL_SECONDS       cache dell'account principale (default 5: lo schermo delle fiere segna i follower entro pochi
//                           secondi; il limite di chiamate di un account Business cresce con le sue impressioni)
//   CLUB_CACHE_TTL_SECONDS  cache degli altri account (default 600)
//   GRAPH_VERSION           default v21.0
//
// Quando l'API non risponde si ridà l'ultimo valore buono (al massimo 24 ore) con syncStatus "cached";
// se non c'è mai stato un valore buono followers è null: niente numeri inventati.

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v21.0"}`;
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || "";
const IG_ID = process.env.INSTAGRAM_USER_ID || "";
const MAIN = (process.env.INSTAGRAM_USERNAME || "fitup.it").toLowerCase();
const ALLOWED = new RegExp(process.env.ALLOWED_USERNAMES || "^fitup[._a-z0-9]*$", "i");
const TTL_MAIN = 1000 * Number(process.env.CACHE_TTL_SECONDS || 5);
const TTL_CLUB = 1000 * Number(process.env.CLUB_CACHE_TTL_SECONDS || 600);
const STALE_MS = 24 * 3600 * 1000;
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6000);
const FIELDS = "id,username,name,followers_count,follows_count,media_count,profile_picture_url";

const cache = new Map(); // username (|d con la demografia) → { payload, at }
const inFlight = new Map();

async function graph(path, params) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) throw new Error(data.error?.message || `Graph API ${r.status}`);
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function profilo(username) {
  if (username === MAIN) return graph(IG_ID, { fields: FIELDS });
  const d = await graph(IG_ID, { fields: `business_discovery.username(${username}){${FIELDS}}` });
  if (!d.business_discovery) throw new Error(`${username}: account non trovato o non Business/Creator`);
  return d.business_discovery;
}

// genere ed età dei follower, aggregati da Instagram (servono almeno 100 follower e l'accesso all'account)
async function demografia(id) {
  const leggi = async (breakdown) => {
    const d = await graph(`${id}/insights`, { metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown });
    const out = {};
    for (const b of d.data?.[0]?.total_value?.breakdowns?.[0]?.results || []) out[b.dimension_values?.[0]] = b.value;
    return out;
  };
  try {
    const [genere, eta] = await Promise.all([leggi("gender"), leggi("age")]);
    return { genere, eta };
  } catch (e) {
    return { errore: e.message };
  }
}

async function aggiorna(username, conDemografia) {
  const p = await profilo(username);
  const followers = Number(p.followers_count);
  if (!Number.isFinite(followers)) throw new Error("followers_count mancante");
  return {
    username: p.username || username,
    name: p.name || null,
    followers,
    following: Number.isFinite(Number(p.follows_count)) ? Number(p.follows_count) : null,
    posts: Number.isFinite(Number(p.media_count)) ? Number(p.media_count) : null,
    avatar: p.profile_picture_url || null,
    demografia: conDemografia && p.id ? await demografia(p.id) : undefined,
    source: "instagram_graph_api",
    syncStatus: "live",
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const username = String(req.query?.username || MAIN).trim().replace(/^@/, "").toLowerCase();
  const conDemografia = req.query?.demografia === "1";
  if (username !== MAIN && !ALLOWED.test(username)) return res.status(400).json({ error: "account non consentito" });
  if (!TOKEN || !IG_ID) {
    return res.status(200).json({ username, followers: null, source: "none", syncStatus: "not_configured", message: "Mancano INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID nelle variabili d'ambiente di Vercel.", updatedAt: new Date().toISOString() });
  }

  const key = username + (conDemografia ? "|d" : "");
  const ttl = username === MAIN ? TTL_MAIN : TTL_CLUB;
  const c = cache.get(key);
  const now = Date.now();
  if (c?.payload && now - c.at < ttl) return res.status(200).json({ ...c.payload, cached: true, cacheAgeSeconds: Math.round((now - c.at) / 1000) });

  try {
    if (!inFlight.has(key)) inFlight.set(key, aggiorna(username, conDemografia).finally(() => inFlight.delete(key)));
    const payload = await inFlight.get(key);
    cache.set(key, { payload, at: Date.now() });
    return res.status(200).json({ ...payload, cached: false, cacheAgeSeconds: 0 });
  } catch (e) {
    if (c?.payload && now - c.at < STALE_MS) {
      return res.status(200).json({ ...c.payload, syncStatus: "cached", source: "instagram_graph_api_cached", message: e.message, cached: true, cacheAgeSeconds: Math.round((now - c.at) / 1000) });
    }
    return res.status(200).json({ username, followers: null, source: "none", syncStatus: "error", message: e.message, updatedAt: new Date().toISOString() });
  }
}
