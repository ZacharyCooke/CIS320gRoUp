import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/api-client";

export interface CurrentUser {
  id: string;
  email: string;
  is_premium: boolean;
  [key: string]: unknown;
}

interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Skips the /auth/me call entirely when there's no stored token — otherwise an
// anonymous visit to a public page (e.g. /store) would 401, trip the api-client's
// refresh-token interceptor, and force-redirect an anonymous visitor to /login.
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("access_token"));
  const [error, setError] = useState<string | null>(null);
  const [refetchNonce, setRefetchNonce] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    apiClient
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setError("Could not load account"))
      .finally(() => setLoading(false));
  }, [refetchNonce]);

  const refetch = useCallback(() => setRefetchNonce((n) => n + 1), []);

  return { user, loading, error, refetch };
}
