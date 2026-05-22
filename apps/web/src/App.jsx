import "./styles.css";
import { useEffect, useState } from "react";

export default function App() {
  const [followers, setFollowers] = useState(8079);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/followers");
        const data = await response.json();

        if (data.followers) {
          setFollowers(data.followers);
        }
      } catch (error) {
        console.error(error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <div className="profile-card">
        <img
          src="https://fitup.it/wp-content/uploads/2022/09/logo-fitup.png"
          alt="FitUP"
          className="logo"
        />

        <div>
          <h1>FitUP</h1>
          <p>@fitup.it</p>
        </div>
      </div>

      <div className="counter-card">
        <div className="counter-number">
          {followers.toLocaleString("en-US")}
        </div>

        <div className="counter-label">
          Followers 👥
        </div>
      </div>
    </div>
  );
}
