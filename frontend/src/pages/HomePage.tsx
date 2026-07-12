import { Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import { PublicTopBar } from "../components/PublicTopBar";
import { Footer } from "../components/Footer";
import { isAuthenticated } from "../services/auth";

export function HomePage() {
  const authed = isAuthenticated();

  return (
    <>
      {authed ? <NavBar /> : <PublicTopBar />}
      <main className="home-page">
        <div className="home-shell">
          <section className="home-hero">
            <div className="home-hero-copy">
              <p className="eyebrow">PetRecovery</p>
              <h1>Bring lost pets home with one coordinated recovery hub.</h1>
              <p>
                PetRecovery keeps your pet profile, public QR tag, lost-pet search, vet alerts,
                found-pet reports, and reward verification in one place so the first hour after a
                pet goes missing is organized instead of chaotic.
              </p>
              <div className="home-actions">
                {authed ? (
                  <Link to="/dashboard"><button type="button">Go to Dashboard</button></Link>
                ) : (
                  <>
                    <Link to="/register"><button type="button">Create an account</button></Link>
                    <Link to="/login"><button type="button" className="btn-outline">Log in</button></Link>
                  </>
                )}
              </div>
            </div>

            <div className="home-hero-panel" aria-label="PetRecovery feature summary">
              <div>
                <strong>1 profile</strong>
                <span>Medical notes, approach guidance, photos, vet contact, and QR tag.</span>
              </div>
              <div>
                <strong>5 mile search</strong>
                <span>Run nearby found reports, linked sources, trackers, and vet BOLOs together.</span>
              </div>
              <div>
                <strong>3 checks</strong>
                <span>Rewards release only after proximity, pet identity, and owner identity pass.</span>
              </div>
            </div>
          </section>

          <section className="home-info-grid">
            <Link to="/features/before" className="home-info-card-link">
              <article>
                <span className="info-kicker">Before</span>
                <h2>Register each pet once</h2>
                <p>
                  Store photos, color, size, temperament, medical conditions, emergency notes,
                  primary vet details, and optional tracking-device links before anything goes wrong.
                </p>
                <span className="home-info-card-cta">See an example →</span>
              </article>
            </Link>
            <Link to="/features/during" className="home-info-card-link">
              <article>
                <span className="info-kicker">During</span>
                <h2>Launch a focused search</h2>
                <p>
                  Mark a pet lost, choose the search radius, stream matching results, alert nearby
                  vet clinics, and keep your active search map in one owner dashboard.
                </p>
                <span className="home-info-card-cta">See an example →</span>
              </article>
            </Link>
            <Link to="/features/community" className="home-info-card-link">
              <article>
                <span className="info-kicker">Community</span>
                <h2>Let anyone help safely</h2>
                <p>
                  A finder can submit a found-pet report without an account. Public QR profiles show
                  only owner-approved information and contact details.
                </p>
                <span className="home-info-card-cta">See an example →</span>
              </article>
            </Link>
            <Link to="/features/recovery" className="home-info-card-link">
              <article>
                <span className="info-kicker">Recovery</span>
                <h2>Verify reunions carefully</h2>
                <p>
                  Optional reward escrow uses proximity, pet identity, and owner confirmation before
                  releasing funds, with audit logs for each step.
                </p>
                <span className="home-info-card-cta">See an example →</span>
              </article>
            </Link>
          </section>

          <section className="home-callout">
            <div>
              <h2>Found a pet?</h2>
              <p>No account is required. Submit a report with location, description, contact info, and an optional photo.</p>
            </div>
            <Link to="/found-report"><button type="button">Report a found pet</button></Link>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}
