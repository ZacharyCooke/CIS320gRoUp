import { useEffect, useState, type FormEvent } from "react";

interface Props {
  label: string;
  defaultUrl: string;
  onSubmit: (url: string) => Promise<boolean>;
  onClose: () => void;
}

export function LinkPopover({ label, defaultUrl, onSubmit, onClose }: Props) {
  const [url, setUrl] = useState(defaultUrl);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit(url);
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <div className="link-popover" role="dialog" aria-label={`Link ${label}`} aria-modal="false">
      <form onSubmit={handleSubmit}>
        <label>
          {label} share URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
            placeholder="https://..."
          />
        </label>
        <div className="link-popover-actions">
          <button type="submit" disabled={submitting}>{submitting ? "Linking…" : "Link"}</button>
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
