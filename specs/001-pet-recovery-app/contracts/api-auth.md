# API Contract: Authentication & Account Security

**Base path**: `/api/auth`  
**Last Updated**: 2026-07-05

All endpoint paths below are relative to `/api/auth`. Passwords are accepted only over HTTPS/TLS in production. Plaintext passwords, password hashes, TOTP secrets, and encrypted Facebook tokens are never returned by the API.

The global API rate limiter can return `429` for repeated requests from the same IP hash.

---

## POST /register

Register a new user account and send one-time verification codes to email and, when provided, phone.

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

`password` must be at least 12 characters.

**Response 201**:
```json
{
  "message": "Verification code sent to email and/or phone.",
  "user_id": "uuid"
}
```

In non-production environments, the response may also include `_dev_otp` for local testing.

**Response 400**: Validation error.  
**Response 409**: `email_already_registered`.

---

## POST /verify-contact

Verify an email address or phone number with a six-digit OTP. A valid verification issues the first token pair.

**Request**:
```json
{
  "user_id": "uuid",
  "channel": "email",
  "code": "847291"
}
```

`channel` is either `email` or `phone`.

**Response 200**:
```json
{
  "verified": true,
  "access_token": "jwt...",
  "refresh_token": "opaque-refresh-token"
}
```

**Response 400**: Validation error or `invalid_or_expired_code`.

---

## POST /login

Authenticate with email and password. The server checks the request IP hash to decide whether a TOTP challenge is required.

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

**Response 200 (new IP and 2FA enabled)**:
```json
{
  "requires_2fa": true,
  "user_id": "uuid"
}
```

**Response 400**: Validation error.  
**Response 401**: `invalid_credentials`.  
**Response 403**: `email_not_verified`.

---

## POST /2fa/setup

Create or replace the authenticated user's TOTP secret. The secret is stored encrypted.

**Auth**: Required.

**Response 200**:
```json
{
  "secret": "BASE32SECRET",
  "qr_uri": "otpauth://totp/PetRecovery%20(owner@example.com)?secret=BASE32SECRET&issuer=PetRecovery",
  "qr_image_url": "data:image/png;base64,..."
}
```

---

## POST /2fa/verify

Dual-mode endpoint for setup confirmation and login challenge completion.

**Setup confirmation request**: send `Authorization: Bearer ...`.
```json
{ "code": "482910" }
```

**Login challenge request**:
```json
{
  "user_id": "uuid",
  "code": "482910"
}
```

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

**Response 400**: Validation error, missing `user_id`, or `invalid_totp_code`.  
**Response 401**: `invalid_token`.

---

## POST /refresh

Rotate a refresh token and issue a new token pair. Current web and iOS clients submit the refresh token in JSON; HttpOnly-cookie storage is a future hardening task.

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

**Response 400**: Validation error.  
**Response 401**: `invalid_or_expired_refresh_token`.

---

## POST /logout

Best-effort refresh-token revocation. The endpoint returns success even if the body is missing or invalid.

**Request**:
```json
{ "refresh_token": "opaque-refresh-token" }
```

**Response 200**:
```json
{ "logged_out": true }
```

---

## GET /me

Return the authenticated user's safe account profile. Sensitive fields are removed before response.

**Auth**: Required.

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "first_name": "Zachary",
    "last_name": "Cooke",
    "email": "owner@example.com",
    "phone": "+15551234567",
    "is_email_verified": true,
    "is_phone_verified": false,
    "is_2fa_enabled": true,
    "facebook_connected": true,
    "is_premium": false,
    "stripe_customer_id": null,
    "notif_pet_update": true,
    "notif_bolo_alert": true,
    "notif_nearby_lost": true,
    "notif_store_account": false,
    "apns_device_token": null,
    "created_at": "2026-07-05T00:00:00.000Z",
    "updated_at": "2026-07-05T00:00:00.000Z"
  }
}
```

**Response 401**: Missing or invalid bearer token.  
**Response 404**: `user_not_found`.

---

## POST /facebook

Initiate Facebook OAuth account linking for read-only local group scanning. This is not a login method; the user must already be authenticated with PetRecovery.

**Auth**: Required.

**Request**:
```json
{ "platform": "web" }
```

`platform` is `web` or `ios` and defaults to `web`.

**Response 200**:
```json
{ "redirect_url": "https://www.facebook.com/v19.0/dialog/oauth?..." }
```

**Response 400**: Validation error.  
**Response 503**: `facebook_not_configured`.

**Scopes requested**: `user_groups`, `groups_access_member_info`.

PetRecovery stores only the encrypted OAuth access token and uses it to read joined-group posts. It never posts to Facebook.

---

## GET /facebook/callback

Facebook OAuth callback endpoint. Facebook redirects here after user authorization. On success, the encrypted access token is linked to the user identified by the signed `state` token.

**Auth**: Not required; called by Facebook redirect.

**Query params**:
- `code`: authorization code from Facebook
- `state`: signed CSRF/account-linking token issued by the server

**Response 302**:
- Web success redirects to `${PUBLIC_WEB_URL}/dashboard`
- iOS success redirects to `petrecovery://facebook-callback?success=true`
- Failure redirects to `${PUBLIC_WEB_URL}/account/settings?error=facebook_auth_failed`

---

## POST /facebook/disconnect

Remove the stored encrypted Facebook access token from the authenticated user's account.

**Auth**: Required.

**Response 200**:
```json
{ "disconnected": true }
```
