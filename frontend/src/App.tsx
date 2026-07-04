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
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { AccountSettingsPage } from "./pages/account/AccountSettingsPage";
import { PublicPetProfile } from "./pages/public/PublicPetProfile";
import { setAccessToken } from "./services/api-client";

const stored = localStorage.getItem("access_token");
if (stored) setAccessToken(stored);

export function App() {
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
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/account/2fa-setup" element={<TwoFactorSetupPage />} />
      </Routes>
    </BrowserRouter>
  );
}
