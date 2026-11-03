# Direct Reprogramming Bookings

## Installation

1. In the existing Supabase project, open SQL Editor and execute `database/direct-repro-bookings.sql` as the project owner. It expects the existing `fl_quote_requests` table from `database/repro-quotes.sql`.
2. Confirm successful execution. Existing manually approved quotes retain their original gross amounts and 50 EUR dyno supplements; new direct orders use a separate pricing snapshot.
3. In the existing Stripe webhook destination, add `checkout.session.expired` alongside `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The existing webhook secret does not change when adding an event.
4. The existing Production Stripe, Resend, Supabase and Turnstile variables remain in use. No new secret is required. Do not weaken RLS or expose the service-role key.
5. After installing SQL, verify the availability API, a supported exact tariff, the checkout and signed webhook in a test deployment first. A real payment has NOT been tested by the automated tests.

## Price Safety And Coverage

- Software tariffs are net EUR for Spain. Add 21% IVA to the software only.
- Dyno supplements are gross: REVO 80 EUR, TLR SPORT 100 EUR. Do not add IVA again.
- All charges use server-side generation, engine and Stage identifiers. Client amounts are ignored except an expected-total equality check that prevents opening payment after a price changes.
- TLR Stage 1 tariffs are fetched from its existing public selector and cached by the existing adapter. An exact, unambiguous model/fuel/engine/power and generation match is required. Unknown versions are rejected before creating an order.
- REVO does not currently have a verified Spanish EUR price feed. No REVO price is guessed or converted from USD/GBP. Stage 2-4 prices are likewise not inferred from Stage 1.
- `data/repro-tariffs.json` is a private server-side verified override list, not a client-editable price list. A record requires `generationId`, `engineIndex`, `stage`, `brand`, `netCents`, `currency: "eur"`, `country: "ES"`, `includesVat: false`, `sourceUrl`, and `verifiedAt`. Obtain verified regional prices before adding records. The supplied performance workbook contains no price column.
- "Asesoradme" remains selectable but cannot produce a charge without selecting a priced preparer.

## Reservation Safety

- One shared reprogramming resource, Monday-Friday, Europe/Madrid, 08:00-13:00 and 14:00-17:00. Session durations are 90/150 minutes without/with dyno, starts every 30 minutes. Require 45 minutes lead time and at most 180 days ahead.
- PostgreSQL exclusion constraints prevent overlapping held, creating or confirmed appointments. Adjacent appointments are allowed. Test/live schedules are isolated.
- Creating an order and holding its appointment is one database transaction. No quotation email is sent. Turnstile and explicit agreement are required.
- An embedded Stripe session lasts at most one hour and expires before the appointment. The slot is retained until Stripe verifies expiry or the signed holder explicitly cancels the unpaid session. Availability also checks expired sessions as a fallback.
- A short `creating` state guards against cancellation while a Stripe session is being created. If a server process is killed in that state, retain the slot for staff review rather than releasing an operation of unknown status. Inspect Stripe before manually releasing an orphaned lock.
- Returning to contact from an open payment expires the unpaid Stripe session before releasing the slot. A completed/paid session cannot be released from that button.
- A browser reload recovers the signed payment reference from sessionStorage without storing contact details or card data.
- Only a verified, matching paid webhook marks the appointment confirmed. The confirmation email contains date/time, amount, service and the contact address for modification/cancellation. Email failure is retried via the webhook and the existing idempotency key.
- The email uses the supplied banner logo. A sender-profile avatar is controlled by receiving email providers; it is not set by an HTML email template.

## Tests

`node tests/direct-repro.cjs` checks pricing, tamper rejection, DST, appointment rules, availability, checkout and webhook/email flow with mocked providers.

`node tests/repro-wizard-browser.cjs` checks the public-page flow on desktop/mobile using mocked Stripe/Turnstile/API responses. No real charges occur.

`node tests/direct-repro-sql.cjs` executes the migration in a disposable PGlite PostgreSQL instance, including overlap rejection, transactional rollback, grants and RLS. PGlite 0.5.14 was downloaded from npm and SHA-512 integrity verified for local testing only; it is not a runtime dependency. To run elsewhere, install `@electric-sql/pglite@0.5.14` in a temporary development directory and set `PGLITE_TEST_PACKAGE` to its absolute package folder. On low-memory machines, run Node with `--liftoff-only --wasm-num-compilation-tasks=1`.

The production database migration, live Stripe account review, end-to-end live charge and real confirmation email still require external verification.
