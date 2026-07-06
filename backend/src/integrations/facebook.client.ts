import { env } from "../config/env.js";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export function isFacebookConfigured(): boolean {
  return Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
}

function facebookCallbackUrl(): string {
  return `${env.API_PUBLIC_URL}/api/auth/facebook/callback`;
}

/** Builds the Facebook OAuth consent-screen URL. Read-only scopes — no posting. */
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    redirect_uri: facebookCallbackUrl(),
    state,
    scope: "user_groups,groups_access_member_info",
    response_type: "code"
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    client_secret: env.FACEBOOK_APP_SECRET!,
    redirect_uri: facebookCallbackUrl(),
    code
  });
  const resp = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  if (!resp.ok) {
    throw new Error(`Facebook token exchange error: ${resp.status}`);
  }
  const data = (await resp.json()) as TokenResponse;
  return data.access_token;
}

interface FacebookGroup {
  id: string;
  name: string;
}

interface FacebookGroupsResponse {
  data: FacebookGroup[];
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
}

interface FacebookFeedResponse {
  data: FacebookPost[];
}

export interface FacebookGroupPost extends FacebookPost {
  groupId: string;
  groupName: string;
}

/** Fetches recent posts from all groups the user is a member of. Read-only — never posts. */
export async function fetchJoinedGroupPosts(accessToken: string): Promise<FacebookGroupPost[]> {
  const groupsResp = await fetch(`${GRAPH_BASE}/me/groups?access_token=${encodeURIComponent(accessToken)}`);
  if (!groupsResp.ok) {
    throw new Error(`Facebook groups fetch error: ${groupsResp.status}`);
  }
  const groups = ((await groupsResp.json()) as FacebookGroupsResponse).data ?? [];

  const postsByGroup = await Promise.all(
    groups.map(async (group) => {
      try {
        const feedResp = await fetch(
          `${GRAPH_BASE}/${group.id}/feed?fields=message,created_time,permalink_url,full_picture&limit=25&access_token=${encodeURIComponent(accessToken)}`
        );
        if (!feedResp.ok) return [];
        const feed = ((await feedResp.json()) as FacebookFeedResponse).data ?? [];
        return feed.map((post) => ({ ...post, groupId: group.id, groupName: group.name }));
      } catch (err) {
        console.error(`[facebook] feed fetch error for group ${group.id}:`, err);
        return [];
      }
    })
  );

  return postsByGroup.flat();
}
