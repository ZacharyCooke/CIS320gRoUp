import { PlaceholderPage } from "./components/PlaceholderPage";

const plannedPages = [
  "Register",
  "Verify Contact",
  "Login",
  "Pet Dashboard",
  "Pet Profile",
  "Search Results",
  "Found Pet Report",
  "Notifications",
  "Reward Setup",
  "Store"
];

export function App() {
  return (
    <main className="app-shell">
      <section className="app-header">
        <p className="eyebrow">PetRecovery</p>
        <h1>Implementation scaffold ready</h1>
        <p>
          Phase 1-2 app structure is in place. Feature pages will be built from the
          Spec Kit tasks using the static HTML mockups as visual references.
        </p>
      </section>

      <section className="page-grid" aria-label="Planned pages">
        {plannedPages.map((page) => (
          <PlaceholderPage key={page} title={page} />
        ))}
      </section>
    </main>
  );
}
