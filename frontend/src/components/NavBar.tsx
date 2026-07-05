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
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0"
      }}
    >
      <Link to="/" style={{ fontWeight: 800, color: "#0f766e", fontSize: "1.1rem", textDecoration: "none" }}>
        🐾 PetRecovery
      </Link>
      <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: "0.9rem" }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/search">Find a Pet</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/account/settings">Account</Link>
        <button
          type="button"
          onClick={handleSignOut}
          style={{ background: "none", color: "#5f6f89", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
