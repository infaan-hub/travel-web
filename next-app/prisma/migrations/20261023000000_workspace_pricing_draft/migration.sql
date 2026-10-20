-- Persist the pricing draft server side so it survives reloads and devices.

ALTER TABLE "workspaces" ADD COLUMN "pricing_draft" JSONB;
