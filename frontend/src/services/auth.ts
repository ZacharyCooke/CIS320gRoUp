export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}
