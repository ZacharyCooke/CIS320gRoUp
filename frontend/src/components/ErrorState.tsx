export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again"
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn-outline" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
