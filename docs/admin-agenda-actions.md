# Private agenda actions

Run `database/admin-booking-actions.sql` in Supabase SQL Editor once.
The endpoint requires the existing admin password and explicit confirmation.

- Remove quote: authenticated soft archive of unpaid requests, including direct payment attempts. Direct checkout holds are released first; open Stripe sessions are verified and expired before archiving. A conditional temporary status lock prevents issuing a fresh payable session while the archive is committed. Paid or actively processing operations cannot be removed. Financial records and Stripe session IDs are never deleted. This archive path uses the existing schema and does not require another SQL migration.
- Move: paid confirmed direct bookings only; validates Madrid weekday/shift/duration. The database exclusion constraint prevents overlapping appointments atomically.
- Cancel: paid records remain paid, appointment is released; no automatic refund. For unpaid sessions, Stripe expiry is verified before releasing the slot.
- Changes record the reason and previous appointment in `config.adminHistory`.
- Client notifications for admin changes are manual; the panel states this after saving.
- Calendar defaults to paid confirmed bookings. Pending payment attempts and expired holds remain stored separately for follow-up on the customer's request. Contact links do not send messages automatically.
- Details are saved when the customer initiates payment, not from unsubmitted form fields.

REVO brand recommendations do not establish software availability or pricing. REVO checkout remains unavailable without a verified matching EUR/Spain tariff. No guessed currency conversion or prices are used.
