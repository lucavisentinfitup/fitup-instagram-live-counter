import "./styles.css";
import { useEffect, useRef, useState } from "react";

const INITIAL_FOLLOWERS = 8079;
const REFRESH_INTERVAL_MS = 30000;
const DEMO_TICK_MS = 4500;

function getRandomFollowerDelta() {
  const movement = Math.random();

  if (movement < 0.45) return 0;
  if (movement < 0.75) return 1;
  return -1;
}

export default function App() {
  const [followers, setFollowers] = useState(INITIAL_FOLLOWERS);
  const [direction, setDirection] = useState("stable");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const previousFollowers = useRef(INITIAL_FOLLOWERS);

  function updateFollowers(nextFollowers) {
    const normalizedFollowers = Math.max(0, Number(nextFollowers));

    setDirection(
      normalizedFollowers > previousFollowers.current
        ? "up"
        : normalizedFollowers < previousFollowers.current
          ? "down"
          : "stable"
    );

    previousFollowers.current = normalizedFollowers;
    setFollowers(normalizedFollowers);
    setUpdatedAt(new Date());
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFollowers() {
      try {
        const response = await fetch("/api/followers", { cache: "no-store" });
        const data = await response.json();

        if (isMounted && Number.isFinite(Number(data.followers))) {
          updateFollowers(data.followers);
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
    };
  }, []);

  useEffect(() => {
    const demoInterval = setInterval(() => {
      setFollowers((currentFollowers) => {
        const nextFollowers = Math.max(0, currentFollowers + getRandomFollowerDelta());

        setDirection(
          nextFollowers > currentFollowers
            ? "up"
            : nextFollowers < currentFollowers
              ? "down"
              : "stable"
        );

        previousFollowers.current = nextFollowers;
        setUpdatedAt(new Date());
        return nextFollowers;
      });
    }, DEMO_TICK_MS);

    return () => clearInterval(demoInterval);
  }, []);

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
          Live demo
        </div>
      </section>

      <section className={`counter-card counter-${direction}`} aria-label="Numero follower Instagram">
        <div className="counter-number" aria-live="polite" key={followers}>
          {followers.toLocaleString("en-US")}
        </div>

        <div className="counter-label">
          Followers <span aria-hidden="true">👥</span>
        </div>

        <p className="updated-at">
          Aggiornato {updatedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </section>
    </main>
  );
}
