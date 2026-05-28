import "./styles.css";
import { useEffect, useRef, useState } from "react";

const INITIAL_FOLLOWERS = 8079;
const FAST_POLL_MS = 500;
const NORMAL_POLL_MS = 1000;
const SLOW_POLL_MS = 5000;
const BOOST_WINDOW_MS = 15000;
const ANIMATION_DURATION_MS = 700;
const ANIMATION_FRAME_MS = 33;
const FITUP_LOGO_SRC = "/Logo_FitUP_originale_sfondo_nero_page-0001-removebg-preview.png";

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function App() {
  const [displayFollowers, setDisplayFollowers] = useState(INITIAL_FOLLOWERS);
  const [direction, setDirection] = useState("stable");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [source, setSource] = useState("fallback");
  const [syncStatus, setSyncStatus] = useState("syncing");

  const previousFollowers = useRef(INITIAL_FOLLOWERS);
  const animationInterval = useRef(null);
  const displayFollowersRef = useRef(INITIAL_FOLLOWERS);
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
    const previousValue = previousFollowers.current;
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
    animateFollowers(displayFollowersRef.current, normalizedFollowers);
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

        if (Number.isFinite(Number(data.followers))) {
          updateFollowers(data.followers);
        }

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

  const isLive = source === "source_api" || source === "source_api_cached";
  const statusLabel = syncStatus === "retrying" ? "SYNCING" : isLive ? "LIVE SOURCE" : "FALLBACK MODE";

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
                <h2>fitup.it</h2>
                <p>Follower Instagram Live</p>
              </div>
            </div>

            <div className="timestamp-block">
              <span>Ultimo aggiornamento</span>

              <strong>
                {updatedAt.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })}
              </strong>
            </div>
          </div>

          <div className={`counter-wrapper counter-${direction}`}>
            <span className="counter-title">Followers</span>

            <div className="counter-number">
              {displayFollowers.toLocaleString("en-US")}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Following</span>
              <strong>351</strong>
            </div>

            <div className="stat-card">
              <span>Posts</span>
              <strong>474</strong>
            </div>

            <div className="stat-card live-stat">
              <span>Status</span>
              <strong>{syncStatus === "retrying" ? "Syncing" : isLive ? "Realtime" : "Cached"}</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
