# RushTV Billing

Stripe subscription checkout for **RushTV Family Access** — friends-and-family monthly billing with a 7-day free trial.

Deploy target: **Cloudflare Pages** (`rushtv-billing.pages.dev` or custom domain).

## What's included

- Landing page with RushTV branding (`#222021` canvas, purple-teal accents)
- Stripe Checkout Session (subscription mode, 7-day trial, $39.99/month)
- Webhook handler for subscription lifecycle events
- Cloudflare KV subscriber store
- Success / cancel pages
- Subscriber status API for TV app integration (MVP)

## Quick share link

After deploy, send people to:

```
https://rushtv-billing.pages.dev
```

Or use the direct checkout redirect (skips email prefill on landing):

```
https://rushtv-billing.pages.dev/api/checkout
```

---

## Stripe Dashboard setup

### 1. Create product

1. [Stripe Dashboard → Products](https://dashboard.stripe.com/products) → **Add product**
2. Name: **RushTV Family Access**
3. Description (customer-facing): *Private family media portal — live TV, movies & shows, requests, and discovery.*
4. Avoid IPTV/Plex/reseller terminology on the product.

### 2. Create price

1. Pricing model: **Recurring**
2. Amount: **$39.99 USD** / **Monthly**
3. Copy the **Price ID** (`price_...`) → `STRIPE_PRICE_ID`

The 7-day trial is applied in code via `subscription_data.trial_period_days` — you do **not** need to set trial on the Price itself.

### 3. Statement descriptor

Set on your Stripe account so card statements show something like **RUSH* FAMILY MEDIA**:

1. [Settings → Business → Public details](https://dashboard.stripe.com/settings/public)
2. **Statement descriptor**: `RUSH* FAMILY MEDIA` (max 22 chars; prefix before `*` is what appears)

Also set `STRIPE_STATEMENT_DESCRIPTOR` in `wrangler.toml` / Pages env for reference.

### 4. API keys

1. [Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Copy **Secret key** → `STRIPE_SECRET_KEY` (use a [restricted key](https://docs.stripe.com/keys/restricted-api-keys) in production)
3. Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional; Checkout Hosted Page doesn't require it on the client)

### 5. Webhook endpoint

1. [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. URL: `https://rushtv-billing.pages.dev/api/webhooks/stripe`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

For local testing:

```bash
stripe listen --forward-to localhost:8788/api/webhooks/stripe
```

---

## Cloudflare setup

### 1. KV namespace

```bash
cd rushtv-billing
npx wrangler kv namespace create SUBSCRIBERS_KV
npx wrangler kv namespace create SUBSCRIBERS_KV --preview
```

Paste the returned IDs into `wrangler.toml` under `[[kv_namespaces]]`.

### 2. Pages secrets

In Cloudflare Dashboard → Workers & Pages → **rushtv-billing** → Settings → Variables, set:

| Variable | Type | Notes |
|----------|------|-------|
| `STRIPE_SECRET_KEY` | Secret | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_...` from webhook endpoint |
| `STRIPE_PRICE_ID` | Secret or Text | `price_...` |
| `PUBLIC_APP_URL` | Text | `https://rushtv-billing.pages.dev` |
| `SUBSCRIBER_API_SECRET` | Secret | Long random string for status API |
| `FREE_SUBSCRIBER_EMAILS` | Text | Comma-separated lifetime access emails (host/family) |
| `STRIPE_STATEMENT_DESCRIPTOR` | Text | `RUSH* FAMILY MEDIA` |
| `FREE_SUBSCRIBER_EMAILS` | Text | Optional comma-separated extra lifetime emails |

### 3. Deploy

```bash
npm install
npm run deploy
```

Or connect the repo in Cloudflare Pages with:

- **Build command:** `npm run build`
- **Build output:** `dist`
- **Root directory:** `rushtv-billing`

---

## Environment variables

See `.env.example`. For local Pages Functions dev with secrets, create `.dev.vars` (gitignored):

```bash
cp .env.example .dev.vars
# edit values
npx wrangler pages dev dist
```

---

## API reference

### POST `/api/checkout`

Creates a Stripe Checkout Session and returns the redirect URL.

```json
{ "email": "family@example.com" }
```

Response:

```json
{ "url": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

### GET `/api/checkout`

Direct redirect to Stripe Checkout. Optional `?email=` prefills `customer_email`:

```
GET /api/checkout?email=family@example.com
```

Allowlisted lifetime emails redirect to `/success?lifetime=1` instead of Stripe.

### POST `/api/webhooks/stripe`

Stripe webhook receiver. Do not call manually.

### GET `/api/subscriber/status?email=user@example.com`

MVP access-control hook for RushTV / tv-media-hub.

When `SUBSCRIBER_API_SECRET` is set, require:

```
Authorization: Bearer <SUBSCRIBER_API_SECRET>
```

Response example:

```json
{
  "active": true,
  "status": "trialing",
  "email": "family@example.com",
  "trialEnd": "2026-07-15T00:00:00.000Z",
  "currentPeriodEnd": "2026-08-08T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "updatedAt": "2026-07-08T19:00:00.000Z"
}
```

See `docs/ACCESS-CONTROL.md` for tv-media-hub wiring notes.

### TV app QR checkout flow

```
RushTV Settings → Subscription
  QR URL (no email):  https://rushtv-billing.pages.dev
  QR URL (email set): https://rushtv-billing.pages.dev/api/checkout?email=...
        │
        ▼
Phone opens Stripe Checkout (7-day trial, $39.99/mo)
        │
        ▼
Stripe webhook → KV subscriber record
        │
        ▼
RushTV polls GET /api/subscriber/status?email=…  (Authorization: Bearer SUBSCRIBER_API_SECRET)
```

Landing page `/?email=…` also prefills the checkout form when opened directly.

---

## Lifetime free access (allowlist)

Some family accounts have **lifetime access** — they are never charged and always return `active: true` from the status API.

Hardcoded in `functions/lib/free-subscribers.ts` (`DEFAULT_FREE_SUBSCRIBER_EMAILS`):

- `brivera2005@gmail.com`
- `riverastreams@gmail.com`
- `ranchorivera@gmail.com`
- `clearbillingservices@gmail.com`
- `aloofluffa@gmail.com`

Optional env override: set `FREE_SUBSCRIBER_EMAILS` to a comma-separated list of additional emails (merged with the defaults).

### Behavior

| Endpoint | Allowlisted email |
|----------|-------------------|
| `GET /api/subscriber/status` | Returns `{ active: true, plan: "lifetime", trial: false, email }` — no Stripe/KV lookup |
| `POST /api/checkout` | Skips Stripe; returns `{ lifetimeAccess: true, message, url }` redirecting to `/success?lifetime=1` |
| Stripe webhooks | Ignored — will not create or downgrade KV records for allowlisted emails |

Emails are matched case-insensitively after trim/lowercase normalization.

---

## Subscriber storage (KV)

Each subscriber is stored under:

- `subscriber:email:{email}` — full record JSON
- `subscriber:customer:{cus_id}` — email lookup for webhooks
- `subscribers:active` — cached list of active/trialing emails

### Referral program (KV)

| Key | Value |
|-----|-------|
| `referral:{CODE}` | referrer email (e.g. `RUSH-AB12` → `family@example.com`) |
| `subscriber:referral:{email}` | `{ referralCode, referredBy?, activeReferralCount }` |
| `referrer:{email}:referred` | JSON array of referred subscriber emails |
| `referrer:{email}:credit-ledger` | `{ pendingCents, updatedAt }` — MVP accrual before Stripe balance apply |

Share URL format:

```
https://rushtv-billing.pages.dev/?ref=RUSH-AB12
```

### GET `/api/referral/status?email=user@example.com`

Requires `Authorization: Bearer SUBSCRIBER_API_SECRET` when configured.

Response:

```json
{
  "code": "RUSH-AB12",
  "shareUrl": "https://rushtv-billing.pages.dev/?ref=RUSH-AB12",
  "activeReferrals": 2,
  "monthlyCreditCents": 1000,
  "capCents": 2000
}
```

- `activeReferrals` — referred subscribers with Stripe status `active` or `trialing` (lifetime allowlist referrals excluded from credit math)
- `monthlyCreditCents` — `min(activeReferrals × $5, $20)`; `0` for lifetime referrers
- Codes are created on first successful checkout webhook

### GET `/api/referral/validate?code=RUSH-AB12`

Public validation for the landing page banner.

### Checkout attribution

Pass `?ref=RUSH-AB12` on the landing page or checkout redirect. The code is stored in Stripe Checkout Session metadata as `referral_code` and applied on `checkout.session.completed`.

### Monthly referral credits (Phase 2)

MVP tracks accrual in KV (`referrer:{email}:credit-ledger`) when a referred subscriber's `invoice.paid` webhook fires. To apply credits to the referrer's next invoice, use [Stripe Customer Balance](https://docs.stripe.com/billing/customer/balance):

```bash
stripe customer_balance_transactions create \
  --customer cus_REFERRER \
  --amount=-1000 \
  --currency=usd \
  --description="RushTV referral credit"
```

Negative `amount` adds credit. Run monthly (cron) or after reviewing `credit-ledger` keys in KV. Constants: `REFERRAL_CREDIT_CENTS=500`, `REFERRAL_CREDIT_CAP_CENTS=2000` in `functions/lib/referrals.ts`.

To inspect KV:

```bash
npx wrangler kv key list --binding SUBSCRIBERS_KV --prefix subscriber:email:
npx wrangler kv key get --binding SUBSCRIBERS_KV "subscriber:email:family@example.com"
```

---

## Custom domain (optional)

Point `billing.rushifymedia.com` (or similar) to the Cloudflare Pages project and update:

- `PUBLIC_APP_URL`
- Stripe webhook URL
- Stripe Checkout success/cancel URLs (derived from `PUBLIC_APP_URL`)

---

## Development

```bash
npm install
npm run dev          # Astro dev server (static pages only)
npm run build
npx wrangler pages dev dist   # Pages + Functions with KV
```

---

## Pricing notes

Default price is **$39.99/month** with a **7-day trial**. See the project README / handoff for pricing analysis and annual option recommendations.
