import "./styles.css";
import { useEffect, useRef, useState } from "react";

// l'API ha una cache di 30 secondi sull'account principale: interrogarla più spesso non dà numeri più freschi
const FAST_POLL_MS = 5000;
const NORMAL_POLL_MS = 10000;
const SLOW_POLL_MS = 20000;
const BOOST_WINDOW_MS = 60000;
const ANIMATION_DURATION_MS = 700;
const ANIMATION_FRAME_MS = 33;
const FITUP_LOGO_SRC = "/logo-fitup.png";

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function App() {
  const [displayFollowers, setDisplayFollowers] = useState(null);
  const [direction, setDirection] = useState("stable");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [source, setSource] = useState("none");
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [profile, setProfile] = useState({ username: "fitup.it", following: null, posts: null, message: "" });

  const previousFollowers = useRef(null);
  const animationInterval = useRef(null);
  const displayFollowersRef = useRef(null);
  const pollTimeout = useRef(null);
  const lastChangeAt = useRef(0);
  const stableCycles = useRef(0);

  function animateFollowers(fromValue, toValue) {
    clearInterval(animationInterval.current);

    if (fromValue === toValue) {
      setDisplayFollowers(toValue);
      displayFollowersRef.current = toValue;
      return;
    }

    const startedAt = Date.now();
    const difference = toValue - fromValue;

    animationInterval.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = Math.round(fromValue + difference * easedProgress);

      displayFollowersRef.current = nextValue;
      setDisplayFollowers(nextValue);

      if (progress >= 1) {
        clearInterval(animationInterval.current);
        displayFollowersRef.current = toValue;
        setDisplayFollowers(toValue);
      }
    }, ANIMATION_FRAME_MS);
  }

  function updateFollowers(nextFollowers) {
    const normalizedFollowers = Math.max(0, Number(nextFollowers));
    const previousValue = previousFollowers.current ?? normalizedFollowers;
    const hasChanged = normalizedFollowers !== previousValue;

    setDirection(normalizedFollowers > previousValue ? "up" : normalizedFollowers < previousValue ? "down" : "stable");

    if (hasChanged) {
      lastChangeAt.current = Date.now();
      stableCycles.current = 0;
    } else {
      stableCycles.current += 1;
    }

    previousFollowers.current = normalizedFollowers;
    setUpdatedAt(new Date());
    animateFollowers(displayFollowersRef.current ?? normalizedFollowers, normalizedFollowers);
  }

  function getNextPollDelay() {
    const now = Date.now();
    const isBoostWindow = lastChangeAt.current && now - lastChangeAt.current < BOOST_WINDOW_MS;

    if (isBoostWindow) {
      return FAST_POLL_MS;
    }

    if (stableCycles.current < 8) {
      return NORMAL_POLL_MS;
    }

    return SLOW_POLL_MS;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFollowers() {
      try {
        setSyncStatus((current) => current === "live" ? "syncing" : current);

        const response = await fetch(`/api/followers?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "cache-control": "no-cache",
            pragma: "no-cache"
          }
        });

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        // followers null = API non configurata o mai riuscita: si mostra "—", non un numero inventato
        if (data.followers != null && Number.isFinite(Number(data.followers))) {
          updateFollowers(data.followers);
        }

        setProfile({ username: data.username || "fitup.it", following: data.following ?? null, posts: data.posts ?? null, message: data.message || "" });

        if (data.source) {
          setSource(data.source);
        }

        setSyncStatus(data.syncStatus || (data.cached ? "cached" : "live"));
      } catch (error) {
        console.error(error);
        setSyncStatus("retrying");
      } finally {
        if (isMounted) {
          pollTimeout.current = setTimeout(loadFollowers, getNextPollDelay());
        }
      }
    }

    loadFollowers();

    return () => {
      isMounted = false;
      clearTimeout(pollTimeout.current);
      clearInterval(animationInterval.current);
    };
  }, []);

  const isLive = source === "instagram_graph_api" || source === "instagram_graph_api_cached";
  const statusLabel = syncStatus === "retrying" || syncStatus === "syncing" ? "SYNCING" : syncStatus === "live" ? "LIVE · INSTAGRAM API" : syncStatus === "cached" ? "ULTIMO VALORE" : syncStatus === "not_configured" ? "API DA CONFIGURARE" : "NON DISPONIBILE";
  const fmt = (n) => (n == null ? "—" : new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(Number(n)));

  return (
    <main className="app">
      <div className="grid-overlay" />
      <div className="laser laser-one" />
      <div className="laser laser-two" />
      <div className="laser laser-three" />

      <section className="dashboard-shell">
        <header className="topbar">
          <div className="brand-block">
            <img src={FITUP_LOGO_SRC} alt="FitUP" className="brand-logo" />

            <div>
              <span className="eyebrow">Realtime Instagram Analytics</span>
              <h1>FitUP Live Counter</h1>
            </div>
          </div>

          <div className="live-pill">
            <span className="status-dot" />
            {statusLabel}
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-header">
            <div className="instagram-block">
              <div className="instagram-icon">◎</div>

              <div>
                <h2>{profile.username}</h2>
                <p>Follower Instagram Live</p>
              </div>
            </div>

            <div className="timestamp-block">
              <span>Ultimo aggiornamento</span>

              <strong>
                {updatedAt ? updatedAt.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                }) : "—"}
              </strong>
            </div>
          </div>

          <div className={`counter-wrapper counter-${direction}`}>
            <span className="counter-title">Followers</span>

            <div className="counter-number">
              {fmt(displayFollowers)}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Following</span>
              <strong>{fmt(profile.following)}</strong>
            </div>

            <div className="stat-card">
              <span>Posts</span>
              <strong>{fmt(profile.posts)}</strong>
            </div>

            <div className="stat-card live-stat">
              <span>Status</span>
              <strong title={profile.message}>{syncStatus === "live" ? "Realtime" : syncStatus === "cached" ? "Cache" : isLive ? "Realtime" : syncStatus === "not_configured" ? "Da configurare" : syncStatus === "retrying" || syncStatus === "syncing" ? "Syncing" : "Errore"}</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
