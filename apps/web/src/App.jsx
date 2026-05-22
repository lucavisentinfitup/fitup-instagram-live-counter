import "./styles.css";
import { useEffect, useRef, useState } from "react";

const INITIAL_FOLLOWERS = 8079;
const REFRESH_INTERVAL_MS = 30000;
const ANIMATION_DURATION_MS = 1200;
const ANIMATION_FRAME_MS = 50;

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function App() {
  const [followers, setFollowers] = useState(INITIAL_FOLLOWERS);
  const [displayFollowers, setDisplayFollowers] = useState(INITIAL_FOLLOWERS);
  const [direction, setDirection] = useState("stable");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [source, setSource] = useState("fallback");
  const previousFollowers = useRef(INITIAL_FOLLOWERS);
  const animationInterval = useRef(null);

  function animateFollowers(fromValue, toValue) {
    clearInterval(animationInterval.current);

    if (fromValue === toValue) {
      setDisplayFollowers(toValue);
      return;
    }

    const startedAt = Date.now();
    const difference = toValue - fromValue;

    animationInterval.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = Math.round(fromValue + difference * easedProgress);

      setDisplayFollowers(nextValue);

      if (progress >= 1) {
        clearInterval(animationInterval.current);
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
    setFollowers(normalizedFollowers);
    setUpdatedAt(new Date());
    animateFollowers(displayFollowers, normalizedFollowers);
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
  }, [displayFollowers]);

  return (
    <main className="app" aria-label="FitUP Instagram live counter">
      <section className="profile-card" aria-label="Profilo Instagram FitUP">
        <div className="profile-identity">
          <img
            src="https://fitup.it/wp-content/uploads/2022/09/logo-fitup.png"
            alt="Logo FitUP"
            className="logo"
          />

          <div className="profile-copy">
            <h1>FitUP</h1>
            <p>@fitup.it</p>
          </div>
        </div>

        <div className="profile-status" aria-label="Stato aggiornamento">
          <span className="status-dot" />
          {source === "instastatistics" ? "Live Source" : "Fallback Mode"}
        </div>
      </section>

      <section className={`counter-card counter-${direction}`} aria-label="Numero follower Instagram">
        <div className="counter-number odometer-number" aria-live="polite">
          {displayFollowers.toLocaleString("en-US")}
        </div>

        <div className="counter-label">
          Followers <span aria-hidden="true">👥</span>
        </div>

        <p className="updated-at">
          Aggiornato {updatedAt.toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}
        </p>
      </section>
    </main>
  );
}
