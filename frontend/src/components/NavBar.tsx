import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../services/api-client";

export function NavBar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  async function handleSignOut() {
    const refresh_token = localStorage.getItem("refresh_token");
    if (refresh_token) {
      apiClient.post("/auth/logout", { refresh_token }).catch(() => {});
    }
    setAccessToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  return (
    <nav className="top-nav">
      <div className="top-nav-bar">
        <Link to="/" className="brand-logo" aria-label="PetRecovery home">
          <span className="brand-mark">PR</span>
          <span>PetRecovery</span>
        </Link>
        <button
          type="button"
          className="top-nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div className={`top-nav-links${menuOpen ? " top-nav-links-open" : ""}`}>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/search" onClick={() => setMenuOpen(false)}>Find a Pet</Link>
        <Link to="/found-report" onClick={() => setMenuOpen(false)}>Report Found Pet</Link>
        <Link to="/community-map" onClick={() => setMenuOpen(false)}>Community Map</Link>
        <Link to="/notifications" onClick={() => setMenuOpen(false)}>Notifications</Link>
        <Link to="/store" onClick={() => setMenuOpen(false)}>Store</Link>
        <Link to="/account/settings" onClick={() => setMenuOpen(false)}>Account</Link>
        <button type="button" onClick={handleSignOut} className="link-button">
          Sign out
        </button>
      </div>
    </nav>
  );
}
