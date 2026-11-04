# Consultation payments

## Activation

Run `database/consultation-bookings.sql` once in the existing Supabase SQL Editor after the direct-booking and admin-action migrations. This is required before telephone and in-person payments can open. It preserves existing repro bookings, adds resource-aware collision checks and service-role-only RPCs. No new keys or Stripe endpoints are required.

The current Stripe live/test gates, restricted key, webhook signing secret, Resend sender and Turnstile widget are reused. No real charge has been performed by the implementation tests.

## Policy

- Telephone: 25 EUR gross for 30 minutes.
- In person: 30 EUR gross for a 30-minute slot.
- Online quote topic: 30 EUR gross regardless of phone/visit selection.
- Monday-Friday. German: 08:00-15:30; Joaquin: 08:00-16:00.
- Tuning and exhausts route to Joaquin; other consultation topics route to German.
- Appointment must start at least 45 minutes in the future and within 180 days.
- Submitted amounts, professional names and durations are not trusted. Policy is validated server-side and fixed prices are also validated by PostgreSQL.
- German and Joaquin have separate consultation resources. Phone and in-person appointments for the same professional cannot overlap. The repro workshop resource remains separate.

## Payment lifecycle

1. Choose service, live slot and contact details; accept terms and Turnstile.
2. The server atomically inserts an unpaid order and temporary hold. Contact details are stored at this point for follow-up.
3. Existing Embedded Checkout opens inside the page. Existing Stripe idempotency/session reuse avoids duplicate creation.
4. Only the verified paid webhook confirms the booking and marks the order paid. A browser callback alone never confirms it.
5. The existing branded confirmation email goes to the customer and BCC flgarage@factorlambda.com. It includes service, professional, date/time, gross price and modification instructions.
6. Expired or explicitly abandoned checkout holds are released using the existing reconciler/cancel flow. Financial and contact history is retained.

The private calendar includes consultation orders, paid/unpaid filters and professional-specific move times. Paid appointments can be moved using a dedicated atomic RPC; cancellation retains the payment and never automatically refunds. Admin changes still require manually notifying the customer.

## Tests

`node tests/consultation-payments.cjs` mocks all providers; verifies fixed prices, consent, session reuse, webhook ownership and confirmation email.

`node --liftoff-only --wasm-num-compilation-tasks=1 tests/consultation-sql.cjs` runs disposable local PostgreSQL tests using the existing test-only PGlite package in work/pglite/package.

`node tests/consultation-browser.cjs` runs mobile/desktop with local HTTP and simulated Stripe/Turnstile; no real booking or payment.
