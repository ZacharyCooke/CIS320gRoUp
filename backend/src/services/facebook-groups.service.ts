import { fetchJoinedGroupPosts, type FacebookGroupPost } from "../integrations/facebook.client.js";
import { decrypt } from "./crypto.service.js";

export interface FacebookGroupsResult {
  external_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  source_url: string | null;
  found_at: Date;
}

function matchesKeywords(post: FacebookGroupPost, keywords: string[]): boolean {
  const haystack = (post.message ?? "").toLowerCase();
  return keywords.some((keyword) => keyword.trim().length > 0 && haystack.includes(keyword.toLowerCase()));
}

/** Reads the owner's joined Facebook groups and returns posts matching the pet's species/color/breed. */
export async function findFacebookGroupMatches(
  encryptedAccessToken: string,
  keywords: (string | null | undefined)[]
): Promise<FacebookGroupsResult[]> {
  const accessToken = decrypt(encryptedAccessToken);
  const posts = await fetchJoinedGroupPosts(accessToken);
  const cleanKeywords = keywords.filter((k): k is string => Boolean(k && k.trim()));

  return posts
    .filter((post) => matchesKeywords(post, cleanKeywords))
    .map((post) => ({
      external_id: post.id,
      name: post.groupName,
      description: post.message ?? null,
      photo_url: post.full_picture ?? null,
      source_url: post.permalink_url ?? null,
      found_at: new Date(post.created_time)
    }));
}
