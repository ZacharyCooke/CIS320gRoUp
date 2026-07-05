import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as FacebookStrategy, type Profile } from "passport-facebook";
import { env } from "../config/env.js";
import { encryptSecret } from "../config/encryption.js";
import { updateUserFacebookToken } from "../models/user.model.js";

export const FACEBOOK_OAUTH_SCOPE = "user_groups,groups_access_member_info";
const STATE_TTL = "10m";
const STATE_PURPOSE = "facebook_oauth";

export interface FacebookOAuthState {
  purpose: typeof STATE_PURPOSE;
  userId: string;
  platform: "web" | "ios";
}

export interface FacebookVerifiedUser {
  userId: string;
  platform: "web" | "ios";
}

function callbackUrl(): string {
  return `${env.PUBLIC_API_URL}/api/auth/facebook/callback`;
}

// PetRecovery never stores Facebook login credentials, only this encrypted
// access token, and only to read (never post to) the user's joined groups.
// Exported (rather than kept as a module-private callback) so it can be unit
// tested directly without exercising passport-facebook's real OAuth2 HTTP calls.
export async function handleFacebookVerify(
  req: import("express").Request,
  accessToken: string,
  _refreshToken: string,
  _profile: Profile,
  done: (error: unknown, user?: FacebookVerifiedUser | false) => void
): Promise<void> {
  try {
    const state = jwt.verify(String(req.query.state), env.JWT_SECRET) as FacebookOAuthState;
    if (state.purpose !== STATE_PURPOSE) {
      done(null, false);
      return;
    }

    await updateUserFacebookToken(state.userId, encryptSecret(accessToken));
    done(null, { userId: state.userId, platform: state.platform });
  } catch {
    // Expired/forged/missing state token — never link a token to the wrong account.
    done(null, false);
  }
}

// passport-oauth2 (which passport-facebook builds on) throws synchronously at
// construction time if clientID/clientSecret are empty — registering the
// strategy unconditionally would crash the whole app at boot whenever
// Facebook isn't configured, the same way every other optional integration
// in this codebase must NOT do.
export const isFacebookConfigured = Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);

if (isFacebookConfigured) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID!,
        clientSecret: env.FACEBOOK_APP_SECRET!,
        callbackURL: callbackUrl(),
        passReqToCallback: true
      },
      handleFacebookVerify
    )
  );
}

// passport-facebook has no "just give me the URL" API for a stateless SPA —
// the initiate step (POST /auth/facebook, Bearer-authenticated) builds this
// URL manually; only the callback step actually invokes passport middleware,
// since that's where the real code-for-token exchange happens.
export function getFacebookAuthUrl(userId: string, platform: "web" | "ios" = "web"): string {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
    throw new Error("Facebook is not configured (FACEBOOK_APP_ID/FACEBOOK_APP_SECRET missing)");
  }

  const state: FacebookOAuthState = { purpose: STATE_PURPOSE, userId, platform };
  const signedState = jwt.sign(state, env.JWT_SECRET, { expiresIn: STATE_TTL });

  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: callbackUrl(),
    state: signedState,
    scope: FACEBOOK_OAUTH_SCOPE
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export { passport };
