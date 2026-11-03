-- Recover only pre-fix locks without a Stripe session. Keep their slot held.
-- Never change paid bookings or bookings with an associated payment session.
UPDATE public.fl_repro_bookings AS b
SET state = 'held'
FROM public.fl_quote_requests AS q
WHERE b.quote_id = q.id
  AND b.state = 'creating'
  AND q.status = 'sent'
  AND q.stripe_session_id IS NULL
  AND q.config->>'flow' = 'direct-v1'
  AND q.created_at < TIMESTAMPTZ '2026-11-03 11:49:17+00'
RETURNING b.quote_id;
