import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { AuthLayout } from "../../components/AuthLayout";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";

export function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [enabled, setEnabled] = useState(false);

  function startSetup() {
    setLoading(true);
    setLoadError(null);
    apiClient
      .post("/auth/2fa/setup")
      .then(({ data }) => {
        setQrImageUrl(data.qr_image_url);
        setSecret(data.secret);
      })
      .catch(() => setLoadError("Could not start 2FA setup — are you logged in?"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    startSetup();
  }, []);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setVerifyError(null);
    setVerifying(true);
    try {
      await apiClient.post("/auth/2fa/verify", { code });
      setEnabled(true);
    } catch {
      setVerifyError("Invalid code — check Authenticator and try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  if (enabled) {
    return (
      <AuthLayout contentStyle={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ color: "#0f766e" }}>2FA Enabled</h1>
        <p>Your account is now protected. Future logins from new devices will require a code from your authenticator app.</p>
        <button type="button" onClick={() => navigate("/account/settings")}>
          Go to Account Settings
        </button>
      </AuthLayout>
    );
  }

  if (loading) {
    return (
      <AuthLayout>
        <Spinner label="Setting up 2FA…" />
      </AuthLayout>
    );
  }

  if (loadError) {
    return (
      <AuthLayout>
        <ErrorState message={loadError} onRetry={startSetup} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
        <h1>Set up Two-Factor Authentication</h1>
        <p style={{ color: "#5f6f89" }}>
          Scan this QR code with an authenticator app (e.g., Microsoft Authenticator, Google Authenticator, or Authy) on your phone, then enter the 6-digit code to confirm.
        </p>

        {qrImageUrl && (
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <img
              src={qrImageUrl}
              alt="Scan with your authenticator app"
              style={{ width: 200, height: 200, borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
          </div>
        )}

        {secret && (
          <details style={{ marginBottom: 16, fontSize: "0.875rem" }}>
            <summary style={{ cursor: "pointer", color: "#5f6f89" }}>
              Can&apos;t scan? Enter code manually
            </summary>
            <code style={{
              display: "block",
              marginTop: 8,
              padding: "10px 14px",
              background: "#f6f8fb",
              borderRadius: 6,
              letterSpacing: "0.15em",
              wordBreak: "break-all"
            }}>
              {secret}
            </code>
          </details>
        )}

        {verifyError && <ErrorState message={verifyError} />}

        <form onSubmit={handleVerify}>
          <label>
            6-digit code from Authenticator
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </label>
          <button type="submit" disabled={verifying || code.length !== 6}>
            {verifying ? "Verifying…" : "Enable 2FA"}
          </button>
        </form>
    </AuthLayout>
  );
}
