CREATE TABLE IF NOT EXISTS "drift_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scope_analysis_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"change_request_text" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drift_analyses_workspace_id" ON "drift_analyses" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drift_analyses_scope_analysis_id" ON "drift_analyses" ("scope_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drift_analyses_created_at" ON "drift_analyses" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drift_analyses" ADD CONSTRAINT "drift_analyses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drift_analyses" ADD CONSTRAINT "drift_analyses_scope_analysis_id_scope_analyses_id_fk" FOREIGN KEY ("scope_analysis_id") REFERENCES "scope_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drift_analyses" ADD CONSTRAINT "drift_analyses_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
