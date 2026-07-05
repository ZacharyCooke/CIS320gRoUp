import { Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";

function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}

export function HomePage() {
  const authed = isAuthenticated();

  return (
    <>
      {authed && <NavBar />}
      <div className="app-shell">
        <header style={{ textAlign: "center", marginBottom: 40 }}>
          <p className="eyebrow">PetRecovery</p>
          <h1 style={{ fontSize: "2.25rem", margin: "0 0 12px" }}>
            Reunite lost pets with their families, faster.
          </h1>
          <p style={{ color: "#5f6f89", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto" }}>
            Register your pet, run a multi-source lost-pet search, alert nearby vet clinics
            automatically, and let the community help bring them home.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
            {authed ? (
              <Link to="/dashboard"><button type="button">Go to Dashboard</button></Link>
            ) : (
              <>
                <Link to="/register"><button type="button">Create an account</button></Link>
                <Link to="/login">
                  <button type="button" style={{ background: "#fff", color: "#0f766e", border: "1px solid #0f766e" }}>
                    Log in
                  </button>
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="page-grid">
          <article className="placeholder-page">
            <h2>Found a pet?</h2>
            <p>No account needed — submit a found-pet report in a couple minutes.</p>
            <Link to="/found-report">Report a found pet →</Link>
          </article>
          <article className="placeholder-page">
            <h2>Multi-source search</h2>
            <p>Searches tracking devices, linked sites, and the community simultaneously.</p>
          </article>
          <article className="placeholder-page">
            <h2>Automatic vet BOLO</h2>
            <p>Nearby vet clinics are emailed automatically the moment a pet is marked lost.</p>
          </article>
        </div>
      </div>
    </>
  );
}
