# API Contract: Authentication & Account Security

**Base path**: `/api/auth`
**Last Updated**: 2026-07-04

---

## POST /auth/register

Register a new user account. Password is transmitted only over HTTPS/TLS; plaintext password is never stored, logged, or returned by the server.

**Request**:
```json
{
  "first_name": "Zachary",
  "last_name": "Cooke",
  "email": "owner@example.com",
  "phone": "+15551234567",
  "password": "user-entered-password"
}
```

**Response 201**:
```json
{
  "message": "Verification code sent to email and/or phone.",
  "user_id": "uuid"
}
```

**Response 400**: Invalid email format, weak password, or duplicate email.

---

## POST /auth/verify-contact

Verify email address or phone number with OTP. Max 3 attempts per issued OTP.

**Request**:
```json
{
  "user_id": "uuid",
  "channel": "email",
  "code": "847291"
}
```

**Response 200**:
```json
{
  "verified": true,
  "access_token": "jwt...",
  "refresh_token": "opaque-refresh-token"
}
```

**Response 400**: Invalid or expired code.
**Response 429**: Too many OTP/register attempts from the same IP hash.

---

## POST /auth/login

Authenticate and start a session. IP hash is checked to determine if 2FA is required.

**Request**:
```json
{
  "email": "owner@example.com",
  "password": "user-entered-password"
}
```

**Response 200 (known IP or 2FA not enabled)**:
```json
{
  "access_token": "jwt...",
  "refresh_token": "opaque-refresh-token",
  "user_id": "uuid"
}
```

**Response 200 (new/unknown IP and 2FA enabled)**:
```json
{
  "requires_2fa": true,
  "user_id": "uuid"
}
```

**Response 401**: Invalid credentials.
**Response 403**: Email not verified.

---

## POST /auth/2fa/setup

Initiate TOTP setup for Microsoft Authenticator or any TOTP-compatible app.

**Auth**: Required (Bearer token)

**Response 200**:
```json
{
  "secret": "BASE32SECRET",
  "otpauth_url": "otpauth://totp/PetRecovery:owner@example.com?secret=BASE32SECRET&issuer=PetRecovery",
  "qr_code_data_url": "data:image/png;base64,..."
}
```

---

## POST /auth/2fa/verify

Dual mode endpoint:
- Setup confirmation: send `Authorization: Bearer ...` and `{ "code": "482910" }`.
- Login challenge: send `{ "user_id": "uuid", "code": "482910" }`.

**Response 200 (setup confirmation)**:
```json
{ "enabled": true }
```

**Response 200 (login challenge)**:
```json
{
  "access_token": "jwt...",
  "refresh_token": "opaque-refresh-token",
  "user_id": "uuid"
}
```

**Response 400/401**: Invalid token, missing user ID, or invalid TOTP code.

---

## POST /auth/refresh

Exchange a refresh token for a new access token. The current web and iOS clients submit the refresh token in JSON; HttpOnly-cookie storage is a future hardening task.

**Request**:
```json
{ "refresh_token": "opaque-refresh-token" }
```

**Response 200**:
```json
{
  "access_token": "jwt...",
  "refresh_token": "new-opaque-refresh-token"
}
```

**Response 401**: Expired or invalid refresh token.

---

## GET /auth/me

Return the authenticated user's safe profile. Sensitive fields such as password hash, TOTP secret, and encrypted Facebook token are never returned.

**Auth**: Required

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "phone": "+15551234567",
    "is_email_verified": true,
    "is_phone_verified": false,
    "is_2fa_enabled": true,
    "facebook_connected": true,
    "notif_pet_update": true,
    "notif_bolo_alert": true,
    "notif_nearby_lost": true,
    "notif_store_account": false
  }
}
```

---

## POST /auth/logout

Revoke refresh token and end session.

**Request**:
```json
{ "refresh_token": "opaque-refresh-token" }
```

**Response 200**:
```json
{ "logged_out": true }
```

---

## POST /auth/facebook

Initiate Facebook OAuth flow to allow reading of the user's local Facebook group posts for found-pet leads.

**Auth**: Required (Bearer token; user must already have a PetRecovery account)

**Request**:
```json
{ "platform": "web" }
```

`platform` is `"web"` or `"ios"` (default `"web"`) and is threaded through the signed `state` token so the callback knows whether to redirect back to the web dashboard or an iOS custom URL scheme.

**Response 200**:
```json
{ "redirect_url": "https://www.facebook.com/v19.0/dialog/oauth?..." }
```

**Response 503**:
```json
{ "error": "facebook_not_configured" }
```

**Scope requested**: `user_groups`, `groups_access_member_info` (read-only; no posting).

**Note**: PetRecovery does not store Facebook credentials. Only the encrypted OAuth access token is stored and used to read joined-group posts.

---

## GET /auth/facebook/callback

OAuth callback endpoint. Facebook redirects here after the user authorizes the app. Stores the encrypted access token and links it to the user's account.

**Auth**: Not required (called by Facebook redirect).

**Query params**:
- `code`: authorization code from Facebook
- `state`: CSRF state token issued by the server

**Response 302**: On success, redirects to `/dashboard` (web) or `petrecovery://facebook-callback?success=true` (iOS). On failure, redirects to `/account/settings?error=facebook_auth_failed`.

---

## POST /auth/facebook/disconnect

Revoke Facebook access and remove the stored token from the user's account.

**Auth**: Required

**Response 200**:
```json
{ "disconnected": true }
```
