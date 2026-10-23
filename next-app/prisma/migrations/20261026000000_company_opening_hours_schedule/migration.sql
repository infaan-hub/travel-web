-- Store company opening hours as structured JSON while retaining legacy text
-- values as JSON strings until each company updates its weekly schedule.
ALTER TABLE "companies"
ALTER COLUMN "opening_hours" TYPE JSONB
USING CASE
  WHEN "opening_hours" IS NULL OR btrim("opening_hours") = '' THEN NULL
  ELSE to_jsonb("opening_hours")
END;
