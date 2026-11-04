# Missing-price lead fallback

When the price API rejects a match, fails or exceeds 20 seconds, the repro wizard offers `Solicitar presupuesto`. It reuses the contact and vehicle fields and requires a separate consent checkbox and Turnstile token. Payment acceptance is hidden because no price is available.

The server validates the vehicle and contact, generates an idempotent request ID from a random request key and validated fields, and inserts an unpaid, unpriced request into the existing quote table. Client-supplied amounts are ignored. The selected appointment is stored only as `requestedAppointment`; no slot RPC or Stripe call is made.

Notifications use the existing Resend sender: a staff notice to flgarage@factorlambda.com and a customer acknowledgement. The saved row survives mail failures. Delivery markers and Resend idempotency keys prevent duplicate messages on retry.

Requests appear in the private Presupuestos view as `Presupuesto solicitado`, with bank preference, requested date and customer contact. They require manual review/contact; the legacy automatic approval form is not offered for these unverified tariffs. No invented amount or legacy bank surcharge is charged.

No SQL migration or new environment variables are needed. Tests use only mocked providers and a local browser server:

- `node tests/repro-fallback.cjs`
- `node tests/repro-fallback-browser.cjs`
