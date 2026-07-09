# RushTV subscriber access control (MVP)

This document describes how to wire **tv-media-hub** (Android TV) or **rushify** web to the billing subscriber store.

## Status API

```
GET https://rushtv-billing.pages.dev/api/subscriber/status?email={email}
Authorization: Bearer {SUBSCRIBER_API_SECRET}
```

Returns `{ active: boolean, status: string, ... }`.

**Active** when `status` is `trialing` or `active`, or when `plan` is `lifetime`.

### Lifetime allowlist

Hardcoded lifetime emails (see `functions/lib/free-subscribers.ts`) always return:

```json
{
  "active": true,
  "plan": "lifetime",
  "trial": false,
  "email": "family@example.com"
}
```

tv-media-hub / any client should treat `plan === "lifetime"` (or `active === true`) as allowed access. No Stripe subscription is created for these emails.

## Recommended integration pattern

Mirror the existing **Tracks PIN gate** pattern in tv-media-hub:

1. Add `BuildConfig.RUSHTV_BILLING_URL` and `RUSHTV_SUBSCRIBER_SECRET` (CI secrets).
2. Create `SubscriberGateClient.kt` (similar to `TracksGateClient.kt`).
3. On app launch (client-facing builds only), prompt for email once and call status API.
4. Cache result in `SettingsDataStore` with 24h TTL.
5. Block main UI when `active === false`.

### Kotlin stub (not implemented in tv-media-hub yet)

```kotlin
// data/remote/billing/SubscriberGateClient.kt
suspend fun checkSubscriber(email: String): Result<Boolean> {
    val request = Request.Builder()
        .url("$billingBase/api/subscriber/status?email=${URLEncoder.encode(email, "UTF-8")}")
        .header("Authorization", "Bearer $subscriberSecret")
        .get()
        .build()
    // Parse JSON: active == true → allow access
}
```

## Alternative: allowlist export

The webhook maintains `subscribers:active` in KV — a JSON array of active emails. For a zero-code MVP, periodically export active emails and set `RUSHIFY_USERS` in rushify `.env`:

```json
[{"username":"family","password":"...","email":"family@example.com"}]
```

This reuses existing rushify auth without Android changes.

## Fail-closed recommendation

For paid family access, **fail closed**:

- API error → treat as inactive (show "subscription required" screen)
- `past_due` / `canceled` → inactive
- `trialing` / `active` / `plan: "lifetime"` → allow

## Future enhancements

- Stripe Customer Portal link for self-service cancel/update card
- Device tokens instead of email (KV `subscriber:device:{token}`)
- Webhook → rushify `RUSHIFY_USERS` sync script
- Annual plan price ID toggle on landing page
