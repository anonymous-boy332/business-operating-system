# Billing setup

## Run locally

Install Node.js, use `.env.example` as a checklist to add any available private credentials to `.env`, then run `npm start` and open `http://localhost:3000`. Do not overwrite an existing `.env`. The local server serves the website and its `/api/*` handlers without requiring Vercel CLI login. It binds to localhost only. AI chat requires `AI_API_KEY`; billing data requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Missing integrations return explicit errors rather than simulated success.

Never commit `.env` or put server credentials in browser code.

## AI generation

Set `AI_API_KEY` to a Groq API key in the server environment for chat. The same key must be configured in Vercel project environment variables after deployment.

## Database and authentication

1. Apply `supabase/migrations/20261103000000_billing.sql` to the existing Supabase project.
2. Apply `supabase/migrations/20261103010000_profile_avatars.sql` to create the private profile-picture bucket and per-user storage policies.
3. Keep email confirmation enabled in Supabase Auth. Trial eligibility and checkout require a confirmed email.
4. Assign Super Admin access only through trusted Supabase Admin tooling by setting `app_metadata.role` to `super_admin`. Never accept this value from user-editable metadata.
5. The current app stores business workspaces and team data in browser storage, not in tenant tables. Billing records therefore belong to the authenticated Supabase user; they are not organization-scoped.

The migration seeds the three plans and the configured prices. An AI-credit limit or business limit of `0` means unlimited. Seeded AI limits are 50 for Starter and unlimited for Professional and Business Plus. Starter and Professional each allow one business; Business Plus is unlimited.

## Vercel environment variables

Required for the billing API:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never use a browser-exposed key here)

Trials and in-app expiration reminders use the Vercel daily cron. To send email reminders as well, configure:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `BILLING_FROM_EMAIL`
- `APP_URL` (the public origin, without a trailing slash)

## Paddle sandbox

The Paddle adapter defaults to sandbox mode. Configure a sandbox API key and a signed webhook endpoint secret:

- `PADDLE_ENVIRONMENT=sandbox` (use `production` only after merchant approval and production setup)
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`

In Pricing Management, map every USD/AED monthly and yearly price to the matching Paddle catalog price ID. Paddle checkout is only opened after an authenticated customer explicitly chooses a plan; a trial is never converted into a charge automatically. Payment, renewal, plan-change, cancellation, failure, and refund state is accepted only from verified Paddle webhooks.

## Safepay

PKR checkout fails closed. It is not enabled until the merchant-approved Safepay checkout and webhook-signature adapter is configured. Safepay credentials alone do not enable payment processing.

To receive PKR payouts in a Pakistani bank account, apply for a merchant account with the chosen local payment provider and ask the provider to register your bank account/IBAN as the settlement account. Complete the provider's business verification and confirm its supported payment methods, settlement schedule, and fees directly with the provider. Do not put bank login details or payment credentials in the website or browser code. Connecting a settlement bank account does not by itself enable checkout in this app; the server-side checkout and verified webhook integration must also be completed.

If you want customers to pay by direct bank transfer instead of a gateway, that needs a separate manual-payment flow: show transfer instructions, record payment references/proof, and activate subscriptions only after a trusted admin verifies the deposit. That flow is not currently implemented.

## Boundaries

- The app has no existing organization database or server-side business/team write APIs. The billing schema is customer-scoped, but enforcing business, team-member, and AI-credit limits against the current browser-storage data would not be secure; those operations must move to authenticated server APIs before quotas can be enforced.
- Paid Paddle plan changes use Paddle's subscription item update flow. Safepay paid-plan management is unavailable while that adapter is disabled.
- No live checkout, reminder email, or webhook could be exercised without the Supabase/Vercel and merchant credentials above. Keep Paddle in sandbox mode for integration testing.
