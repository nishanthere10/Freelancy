CREATE UNIQUE INDEX IF NOT EXISTS "idx_automation_runs_event_automation_uq" ON "automation_runs" ("automation_event_id", "automation_id");
