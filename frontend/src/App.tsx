import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Spinner } from "./components/Spinner";
import { setAccessToken } from "./services/api-client";

function lazyPage<T extends Record<string, React.ComponentType<object>>>(
  loader: () => Promise<T>,
  exportName: keyof T
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });
}

const HomePage = lazyPage(() => import("./pages/HomePage"), "HomePage");
const RegisterPage = lazyPage(() => import("./pages/auth/RegisterPage"), "RegisterPage");
const VerifyContactPage = lazyPage(() => import("./pages/auth/VerifyContactPage"), "VerifyContactPage");
const LoginPage = lazyPage(() => import("./pages/auth/LoginPage"), "LoginPage");
const TwoFactorSetupPage = lazyPage(() => import("./pages/auth/TwoFactorSetupPage"), "TwoFactorSetupPage");
const DashboardPage = lazyPage(() => import("./pages/pets/DashboardPage"), "DashboardPage");
const PetFormPage = lazyPage(() => import("./pages/pets/PetFormPage"), "PetFormPage");
const PetProfilePage = lazyPage(() => import("./pages/pets/PetProfilePage"), "PetProfilePage");
const SearchResultsPage = lazyPage(() => import("./pages/search/SearchResultsPage"), "SearchResultsPage");
const FindPetPage = lazyPage(() => import("./pages/search/FindPetPage"), "FindPetPage");
const FoundReportPage = lazyPage(() => import("./pages/search/FoundReportPage"), "FoundReportPage");
const NotificationsPage = lazyPage(() => import("./pages/notifications/NotificationsPage"), "NotificationsPage");
const RewardSetupPage = lazyPage(() => import("./pages/reward/RewardSetupPage"), "RewardSetupPage");
const ProximityVerificationPage = lazyPage(
  () => import("./pages/reward/ProximityVerificationPage"),
  "ProximityVerificationPage"
);
const AccountSettingsPage = lazyPage(() => import("./pages/account/AccountSettingsPage"), "AccountSettingsPage");
const PublicPetProfile = lazyPage(() => import("./pages/public/PublicPetProfile"), "PublicPetProfile");
const StorePage = lazyPage(() => import("./pages/store/StorePage"), "StorePage");
const PremiumCheckoutPage = lazyPage(() => import("./pages/store/PremiumCheckoutPage"), "PremiumCheckoutPage");

const stored = localStorage.getItem("access_token");
if (stored) setAccessToken(stored);

function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense
          fallback={
            <section className="app-shell">
              <Spinner />
            </section>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/p/:token" element={<PublicPetProfile />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/found-report" element={<FoundReportPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/premium" element={<RequireAuth><PremiumCheckoutPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/pets/new" element={<RequireAuth><PetFormPage /></RequireAuth>} />
            <Route path="/pets/:id" element={<RequireAuth><PetProfilePage /></RequireAuth>} />
            <Route path="/search" element={<RequireAuth><FindPetPage /></RequireAuth>} />
            <Route path="/searches/:id" element={<RequireAuth><SearchResultsPage /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/pets/:id/reward" element={<RequireAuth><RewardSetupPage /></RequireAuth>} />
            <Route path="/rewards/:id/verify" element={<RequireAuth><ProximityVerificationPage /></RequireAuth>} />
            <Route path="/account/settings" element={<RequireAuth><AccountSettingsPage /></RequireAuth>} />
            <Route path="/account/2fa-setup" element={<RequireAuth><TwoFactorSetupPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
