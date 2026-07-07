/** Thin wrapper around the browser Notification API — used for OS-level alerts
 *  when a WebSocket push arrives while the tab isn't focused. */
export function showBrowserNotification(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  new Notification(title, { body });
}
