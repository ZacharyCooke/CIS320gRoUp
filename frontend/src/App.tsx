import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyContactPage } from "./pages/auth/VerifyContactPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { TwoFactorSetupPage } from "./pages/auth/TwoFactorSetupPage";
import { DashboardPage } from "./pages/pets/DashboardPage";
import { PetFormPage } from "./pages/pets/PetFormPage";
import { PetProfilePage } from "./pages/pets/PetProfilePage";
import { SearchResultsPage } from "./pages/search/SearchResultsPage";
import { FoundReportPage } from "./pages/search/FoundReportPage";
import { CommunityMapPage } from "./pages/search/CommunityMapPage";
import { AccountSettingsPage } from "./pages/account/AccountSettingsPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { RewardSetupPage } from "./pages/reward/RewardSetupPage";
import { ProximityVerificationPage } from "./pages/reward/ProximityVerificationPage";
import { StorePage } from "./pages/store/StorePage";
import { PremiumCheckoutPage } from "./pages/store/PremiumCheckoutPage";
import { PublicPetProfile } from "./pages/public/PublicPetProfile";
import { apiClient, setAccessToken, setRefreshTokenHandler } from "./services/api-client";
import { notificationPermission, requestNotificationPermission } from "./services/push-notifications";

const stored = localStorage.getItem("access_token");
if (stored) setAccessToken(stored);

// Installs the 401-retry handler the api-client interceptor calls — without
// this, an expired 15-minute access token fails every request instead of
// silently refreshing via the stored refresh_token.
setRefreshTokenHandler(async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const { data } = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
    localStorage.setItem("access_token", data.access_token);
    return data.access_token as string;
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return null;
  }
});

export function App() {
  useEffect(() => {
    if (!stored) return; // only prompt once a user is logged in
    if (notificationPermission() !== "default") return;
    if (sessionStorage.getItem("notif_permission_asked")) return;
    sessionStorage.setItem("notif_permission_asked", "true");
    requestNotificationPermission();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/p/:token" element={<PublicPetProfile />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pets/new" element={<PetFormPage />} />
        <Route path="/pets/:id" element={<PetProfilePage />} />
        <Route path="/searches/:id" element={<SearchResultsPage />} />
        <Route path="/found-report" element={<FoundReportPage />} />
        <Route path="/community-map" element={<CommunityMapPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/account/2fa-setup" element={<TwoFactorSetupPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/pets/:id/reward" element={<RewardSetupPage />} />
        <Route path="/rewards/:id/proximity" element={<ProximityVerificationPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/store/premium" element={<PremiumCheckoutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
