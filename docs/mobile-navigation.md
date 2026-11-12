# Mobile navigation and appointment entry

The shared citas.js loader adds mobile-nav.js to public pages. Existing navigation links and the orange appointment CTA are retained. Small public headers receive a mobile-only canonical navigation and appointment link. Private admin headers are not affected.

Below 981px the header shows the brand, orange Pedir cita CTA and a fixed-size toggle on the right. The dropdown supports link selection, outside clicks, Escape with focus return, focus leaving the header and viewport changes. Desktop navigation retains its original layout.

The Reprogramacion option in Pedir cita is an entry point to /haz-tu-repro.html, not a new consultation product. It bypasses the consultation topic requirement and opens the existing vehicle catalogue, results, provider recommendations, tariffs, agenda and payment flow. It cannot submit a 25/30 EUR consultation payment for a repro. No backend, SQL, pricing or Stripe configuration is changed.

Browser coverage: 320/390/768 mobile and 1440 desktop, original/generated headers, orange CTA, keyboard/outside/link dismissal, and the repro route without payment calls. Test services are mocked.
