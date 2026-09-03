/* Align existing projects with the ZAR V2 invitation lifecycle. */
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_status_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_status_check
  CHECK (status IN ('draft', 'active', 'expired', 'archived'));
