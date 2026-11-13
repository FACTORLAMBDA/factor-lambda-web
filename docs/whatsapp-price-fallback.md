# Missing-price WhatsApp handoff

When `direct-price` fails, the public repro wizard offers a WhatsApp button
instead of posting `fallback-lead`. After explicit consent, the customer's
click opens https://wa.me/34644313664 with the completed vehicle, stage,
provider, dyno, duration, date preference, contact details and notes encoded
as text. The customer still sends the message inside WhatsApp.

This path sends no email, creates no Stripe operation and reserves no slot.
It does not depend on Turnstile or the quote API being enabled. Successful
price lookups continue through the existing payment and verified webhook path.
The old backend fallback endpoint remains for compatibility with already-open
older clients; the new wizard does not use it.

A missing price is not proof that the software is under development. Only
provider-confirmed development status should be described that way.

Creating a payment link from staff messages in WhatsApp is not implemented by
this change. It requires authenticated WhatsApp Business API webhooks, staff
authorization, an explicit currency/VAT amount and confirmation before sending
an offer. Existing private quote administration remains available.

Browser test: `node tests/repro-fallback-browser.cjs` (all services mocked).
