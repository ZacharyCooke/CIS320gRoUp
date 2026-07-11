import { Link } from "react-router-dom";

// The equivalent of NavBar for a visitor who isn't logged in — shown on
// public-facing pages (found-report, feature showcases, home, store) instead
// of the full authenticated nav, since links like Dashboard/Notifications/
// Account/Sign out don't apply to someone with no session. Never gates any
// of these pages behind auth; it's purely a navigation affordance.
export function PublicTopBar() {
  return (
    <header className="home-topbar">
      <Link to="/" className="brand-logo" aria-label="PetRecovery home">
        <span className="brand-mark">PR</span>
        <span>PetRecovery</span>
      </Link>
      <nav className="home-topbar-links">
        <Link to="/found-report">Report Found Pet</Link>
        <Link to="/store">Store</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </header>
  );
}
