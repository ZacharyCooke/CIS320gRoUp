# API Contract: Authentication & Account Security

**Base path**: `/api/v1/auth`
**Last Updated**: 2026-07-01

---

## POST /auth/register

Register a new user account. Password is hashed client-side before transmission; plaintext password is never sent.

**Request**:
```json
{
  "email": "owner@example.com",
  "phone": "+15551234567",
  "password_hash": "bcrypt-hash-of-password"
}
```

**Response 201**:
```json
{
  "message": "Verification code sent to email and/or phone.",
  "user_id": "uuid"
}
```

**Response 400**: Invalid email format, weak password hash, or duplicate email.

---

## POST /auth/verify-contact

Verify email address or phone number with OTP. Max 3 attempts; account locked for 15 minutes on failure.

**Request**:
```json
{
  "user_id": "uuid",
  "channel": "email",
  "code": "847291"
}
```

**Response 200**: `{ "verified": true }`
**Response 400**: Invalid or expired code.
**Response 429**: Too many attempts; account temporarily locked.

---

## POST /auth/login

Authenticate and start a session. IP hash is checked to determine if 2FA is required.

**Request**:
```json
{
  "email": "owner@example.com",
  "password_hash": "bcrypt-hash-of-password"
}
```

**Response 200 (known IP)**:
```json
{
  "access_token": "jwt...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Response 202 (new/unknown IP — 2FA required)**:
```json
{
  "requires_2fa": true,
  "challenge_token": "short-lived-token"
}
```

**Response 401**: Invalid credentials.

---

## POST /auth/2fa/setup

Initiate TOTP setup for Microsoft Authenticator (or any TOTP-compatible app).

**Auth**: Required (Bearer token)

**Response 200**:
```json
{
  "totp_uri": "otpauth://totp/PetRecovery:owner@example.com?secret=BASE32SECRET&issuer=PetRecovery",
  "qr_code_url": "https://api.petrecovery.app/auth/2fa/qr/..."
}
```

---

## POST /auth/2fa/verify

Complete TOTP challenge after login from unknown IP. On success the IP hash is stored as trusted.

**Request**:
```json
{
  "challenge_token": "short-lived-token",
  "totp_code": "482910"
}
```

**Response 200**:
```json
{
  "access_token": "jwt...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Response 401**: Invalid or expired TOTP code.

---

## POST /auth/refresh

Exchange a refresh token (HttpOnly cookie) for a new access token.

**Request**: No body — refresh token is read from HttpOnly cookie.

**Response 200**: `{ "access_token": "jwt...", "expires_in": 900 }`
**Response 401**: Expired or invalid refresh token.

---

## POST /auth/logout

Revoke refresh token and end session.

**Auth**: Required

**Response 204**: No content.

---

## POST /auth/facebook

Initiate Facebook OAuth flow to allow reading of the user's local Facebook group posts for found-pet leads. Redirects to Facebook login.

**Auth**: Required (Bearer token — user must already have a PetRecovery account)

**Response 302**: Redirect to Facebook OAuth consent screen.

**Scope requested**: `user_groups`, `groups_access_member_info` (read-only; no posting).

**Note**: PetRecovery does NOT store Facebook credentials. Only the encrypted OAuth access token is stored for the duration of the session.

---

## GET /auth/facebook/callback

OAuth callback endpoint. Facebook redirects here after the user authorizes the app. Stores the encrypted access token and links it to the user's account.

**Auth**: Not required (called by Facebook redirect).

**Query params**:
- `code` — authorization code from Facebook
- `state` — CSRF state token issued by the server

**Response 302**: Redirects to `/dashboard` on success or `/settings?error=facebook_auth_failed` on failure.

**Response 400**: Invalid state token (CSRF mismatch).

---

## POST /auth/facebook/disconnect

Revoke Facebook access and remove the stored token from the user's account.

**Auth**: Required

**Response 200**: `{ "disconnected": true }`
