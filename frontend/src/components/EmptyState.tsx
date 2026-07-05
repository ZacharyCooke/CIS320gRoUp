import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: string;
  message: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  /** Compact form renders as a single hint line, matching existing inline empty-state text (e.g. "No tracking devices linked yet."). */
  compact?: boolean;
}

export function EmptyState({ icon, message, actionLabel, actionTo, onAction, compact }: EmptyStateProps) {
  if (compact) {
    return <p className="form-hint">{message}</p>;
  }

  return (
    <div className="empty-state">
      {icon && <p className="empty-state-icon">{icon}</p>}
      <p className="empty-state-message">{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <button type="button">{actionLabel}</button>
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
