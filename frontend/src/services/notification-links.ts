export interface LinkableNotification {
  type: string;
  data: Record<string, unknown>;
  trigger_latitude: number | null;
  trigger_longitude: number | null;
}

// Where clicking a notification should take you, if anywhere. found_report_match
// carries a precise search_id (the real search-results map); bolo_alert/nearby_lost/
// nearby_found only have the recipient's trigger location (where the proximity ping
// fired from — not the incident's own coordinates), so those go to the community map
// centered there instead. Other types (claim_alert, store_account, etc.) have no
// map-relevant destination and are left non-interactive. Shared by NotificationsPage
// and NotificationBell so the two surfaces never drift out of sync.
export function notificationLink(n: LinkableNotification): string | null {
  if (n.type === "found_report_match" && typeof n.data.search_id === "string") {
    return `/searches/${n.data.search_id}`;
  }
  if (
    (n.type === "bolo_alert" || n.type === "nearby_lost" || n.type === "nearby_found") &&
    n.trigger_latitude != null &&
    n.trigger_longitude != null
  ) {
    return `/community-map?lat=${n.trigger_latitude}&lng=${n.trigger_longitude}&radius=5`;
  }
  return null;
}
