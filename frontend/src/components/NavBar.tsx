import { Link, useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../services/api-client";

export function NavBar() {
  const navigate = useNavigate();

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
      <Link to="/" className="brand-logo" aria-label="PetRecovery home">
        <span className="brand-mark">PR</span>
        <span>PetRecovery</span>
      </Link>
      <div className="top-nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/search">Find a Pet</Link>
        <Link to="/community-map">Community Map</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/store">Store</Link>
        <Link to="/account/settings">Account</Link>
        <button type="button" onClick={handleSignOut} className="link-button">
          Sign out
        </button>
      </div>
    </nav>
  );
}
