-- Adds a third per-custom-type toggle alongside can_request_cover and
-- receive_alerts: whether this type's users get the manual "Email" /
-- "Alert ..." compose buttons (Alerts page, Milestone Detail page) that
-- let them send an email directly to a shipment's consignee/contact.
-- This is separate from receive_alerts (the automated overdue-milestone
-- digest, not yet wired to a sender) — this one gates a button that
-- already works today for every type, same as Sales/Operation.
--
-- Default true so existing custom types keep the same behavior they have
-- today (the button has always been shown, unconditionally) until an
-- admin explicitly turns it off for a type from System Settings -> User
-- Types.

ALTER TABLE user_types
  ADD COLUMN IF NOT EXISTS can_email_clients boolean NOT NULL DEFAULT true;
