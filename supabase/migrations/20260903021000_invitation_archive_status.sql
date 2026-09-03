/*
# ZAR V2 — Invitation Archive Status Support

Extends public.invitations.status CHECK constraint to include 'archived'.
*/

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_status_check
  CHECK (status IN ('draft', 'active', 'expired', 'archived'));
