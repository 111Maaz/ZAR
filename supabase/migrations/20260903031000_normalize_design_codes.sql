/* Design routing is an allow-list. Correct legacy uppercase registrations. */
UPDATE public.designs AS d
SET design_code = lower(d.design_code)
WHERE lower(d.design_code) IN ('design_01', 'design_02', 'design_03', 'design_04', 'design_05')
  AND d.design_code <> lower(d.design_code)
  AND NOT EXISTS (
    SELECT 1 FROM public.designs AS existing
    WHERE existing.design_code = lower(d.design_code)
      AND existing.id <> d.id
  );

CREATE OR REPLACE FUNCTION public.validate_design_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.design_code := lower(trim(NEW.design_code));
  IF NEW.design_code NOT IN ('design_01', 'design_02', 'design_03', 'design_04', 'design_05') THEN
    RAISE EXCEPTION 'Design code must be one of: design_01, design_02, design_03, design_04, design_05';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_design_code ON public.designs;
CREATE TRIGGER validate_design_code BEFORE INSERT OR UPDATE OF design_code ON public.designs
FOR EACH ROW EXECUTE FUNCTION public.validate_design_code();
