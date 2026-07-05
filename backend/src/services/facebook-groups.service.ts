const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
}

interface FacebookFeedResponse {
  data: FacebookPost[];
}

export interface FacebookGroupPostMatch {
  external_id: string;
  description: string;
  source_url: string | null;
  found_at: Date;
}

export interface FacebookGroupsSearchFilter {
  species?: string | null;
  breed?: string | null;
  color?: string | null;
}

function matchesFilter(message: string, filter: FacebookGroupsSearchFilter): boolean {
  const haystack = message.toLowerCase();
  const keywords = [filter.species, filter.breed, filter.color]
    .filter((v): v is string => !!v)
    .map((v) => v.toLowerCase());

  if (keywords.length === 0) return true;
  return keywords.some((keyword) => haystack.includes(keyword));
}

async function fetchJoinedGroups(accessToken: string): Promise<FacebookGroup[]> {
  const resp = await fetch(`${GRAPH_API_BASE}/me/groups?access_token=${accessToken}`);
  if (!resp.ok) {
    throw new Error(`Facebook groups list error: ${resp.status}`);
  }
  const data = (await resp.json()) as FacebookGroupsResponse;
  return data.data ?? [];
}

async function fetchGroupFeed(groupId: string, accessToken: string): Promise<FacebookPost[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,message,created_time,permalink_url"
  });
  const resp = await fetch(`${GRAPH_API_BASE}/${groupId}/feed?${params}`);
  if (!resp.ok) {
    throw new Error(`Facebook group feed error: ${resp.status}`);
  }
  const data = (await resp.json()) as FacebookFeedResponse;
  return data.data ?? [];
}

// Read-only: fetches posts from groups the user has already joined and
// filters them by pet species/breed/color keywords — never posts, comments,
// or reads anything beyond what's needed to surface lost-pet leads (FR-029).
export async function fetchGroupPosts(
  accessToken: string,
  filter: FacebookGroupsSearchFilter
): Promise<FacebookGroupPostMatch[]> {
  try {
    const groups = await fetchJoinedGroups(accessToken);
    const matches: FacebookGroupPostMatch[] = [];

    for (const group of groups) {
      try {
        const posts = await fetchGroupFeed(group.id, accessToken);
        for (const post of posts) {
          if (!post.message || !matchesFilter(post.message, filter)) continue;
          matches.push({
            external_id: post.id,
            description: post.message,
            source_url: post.permalink_url ?? null,
            found_at: new Date(post.created_time)
          });
        }
      } catch (err) {
        console.error(`[facebook-groups] feed error for group ${group.id}:`, err);
      }
    }

    return matches;
  } catch (err) {
    console.error("[facebook-groups] group list error:", err);
    return [];
  }
}
