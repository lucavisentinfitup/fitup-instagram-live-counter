import "./styles.css";
import { useEffect, useRef, useState } from "react";

const INITIAL_FOLLOWERS = 8079;
const REFRESH_INTERVAL_MS = 1000;
const ANIMATION_DURATION_MS = 700;
const ANIMATION_FRAME_MS = 33;

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function App() {
  const [displayFollowers, setDisplayFollowers] = useState(INITIAL_FOLLOWERS);
  const [direction, setDirection] = useState("stable");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [source, setSource] = useState("fallback");

  const previousFollowers = useRef(INITIAL_FOLLOWERS);
  const animationInterval = useRef(null);
  const displayFollowersRef = useRef(INITIAL_FOLLOWERS);

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

    setDirection(
      normalizedFollowers > previousValue
        ? "up"
        : normalizedFollowers < previousValue
          ? "down"
          : "stable"
    );

    previousFollowers.current = normalizedFollowers;
    setUpdatedAt(new Date());
    animateFollowers(displayFollowersRef.current, normalizedFollowers);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFollowers() {
      try {
        const response = await fetch("/api/followers", {
          cache: "no-store"
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
      } catch (error) {
        console.error(error);
      }
    }

    loadFollowers();
    const interval = setInterval(loadFollowers, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(animationInterval.current);
    };
  }, []);

  const isLive = source === "source_api" || source === "source_api_cached";

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
              src="https://fitup.it/wp-content/uploads/2022/09/logo-fitup.png"
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
            {isLive ? "LIVE SOURCE" : "FALLBACK MODE"}
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
              <strong>{isLive ? "Realtime" : "Cached"}</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
