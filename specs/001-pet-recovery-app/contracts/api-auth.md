# API Contract: Authentication & Account Security

**Base path**: `/api/v1/auth`

---

## POST /auth/register

Register a new user account.

**Request**:
```json
{
  "email": "owner@example.com",
  "phone": "+15551234567",
  "password": "SecurePass123!"
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

Verify email address or phone number with OTP.

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

Authenticate and start a session.

**Request**:
```json
{
  "email": "owner@example.com",
  "password": "SecurePass123!"
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

**Response 202 (new/unknown IP)**:
```json
{
  "requires_2fa": true,
  "challenge_token": "short-lived-token"
}
```

**Response 401**: Invalid credentials.

---

## POST /auth/2fa/setup

Initiate TOTP setup for Microsoft Authenticator (or any TOTP app).

**Auth**: Required (Bearer token)

**Response 200**:
```json
{
  "totp_uri": "otpauth://totp/PetRecovery:owner@example.com?secret=BASE32SECRET&issuer=PetRecovery",
  "qr_code_url": "https://api.petrecovery.app/qr/..."
}
```

---

## POST /auth/2fa/verify

Complete TOTP challenge after login from unknown IP.

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

Exchange a refresh token for a new access token.

**Request**: HttpOnly cookie containing refresh token (no body needed)

**Response 200**: New `access_token` and expiry.
**Response 401**: Expired or invalid refresh token.

---

## POST /auth/logout

Revoke refresh token and end session.

**Auth**: Required

**Response 204**: No content.
