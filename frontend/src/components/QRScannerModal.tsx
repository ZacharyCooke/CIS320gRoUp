import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";

interface QRScannerModalProps {
  onClose: () => void;
}

const READER_ID = "qr-reader-region";

/**
 * Extracts the public profile token from a scanned value. Accepts either a
 * full URL (…/p/<token>) or a bare token string.
 */
function extractToken(decoded: string): string | null {
  const trimmed = decoded.trim();
  const match = trimmed.match(/\/p\/([^/?#\s]+)/);
  if (match) return match[1];
  // Bare UUID-ish token
  if (/^[a-zA-Z0-9-]{8,}$/.test(trimmed)) return trimmed;
  return null;
}

export function QRScannerModal({ onClose }: QRScannerModalProps) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          const token = extractToken(decoded);
          if (!token) {
            setError("Scanned code is not a PetRecovery profile.");
            return;
          }
          stopped = true;
          scanner.stop().finally(() => {
            onClose();
            navigate(`/p/${token}`);
          });
        },
        () => {
          // per-frame decode failures are expected; ignore
        }
      )
      .catch(() => setError("Unable to access camera. Check browser permissions."));

    return () => {
      if (!stopped && scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [navigate, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR code"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div style={{ background: "white", padding: 20, borderRadius: 12, maxWidth: 360, width: "90%" }}>
        <h2 style={{ marginTop: 0 }}>Scan pet QR code</h2>
        <div id={READER_ID} style={{ width: "100%" }} />
        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        <button type="button" onClick={onClose} style={{ marginTop: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
