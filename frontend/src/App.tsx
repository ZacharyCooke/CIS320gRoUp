import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyContactPage } from "./pages/auth/VerifyContactPage";
import { DashboardPage } from "./pages/pets/DashboardPage";
import { PetFormPage } from "./pages/pets/PetFormPage";
import { PetProfilePage } from "./pages/pets/PetProfilePage";
import { setAccessToken } from "./services/api-client";

const stored = localStorage.getItem("access_token");
if (stored) setAccessToken(stored);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyContactPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pets/new" element={<PetFormPage />} />
        <Route path="/pets/:id" element={<PetProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
