import "./styles.css";
import { useEffect, useRef, useState } from "react";

const INITIAL_FOLLOWERS = 8079;
const FAST_POLL_MS = 500;
const NORMAL_POLL_MS = 1000;
const SLOW_POLL_MS = 5000;
const BOOST_WINDOW_MS = 15000;
const ANIMATION_DURATION_MS = 700;
const ANIMATION_FRAME_MS = 33;
const FITUP_LOGO_SRC = "data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/0/7H1sfZ+spsmjlAAAAAElFTkSuQmCC";

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

    setDirection(
      normalizedFollowers > previousValue
        ? "up"
        : normalizedFollowers < previousValue
          ? "down"
          : "stable"
    );

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
  const statusLabel = syncStatus === "retrying"
    ? "SYNCING"
    : isLive
      ? "LIVE SOURCE"
      : "FALLBACK MODE";

  return (
    <main className="app">
      <div className="grid-overlay" />
      <div className="laser laser-one" />
      <div className="laser laser-two" />
      <div className="laser laser-three" />

      <section className="dashboard-shell">
        <header className="topbar">
          <div className="brand-block">
            <img
              src={FITUP_LOGO_SRC}
              alt="FitUP"
              className="brand-logo"
            />

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
