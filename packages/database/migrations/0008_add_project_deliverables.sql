DO $$ BEGIN
 CREATE TYPE "project_deliverable_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"estimated_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"logged_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"complexity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" "project_deliverable_status" DEFAULT 'pending' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"source_scope_id" uuid,
	"invoice_id" uuid,
	"billed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_workspace_id" ON "project_deliverables" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_project_id" ON "project_deliverables" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_status" ON "project_deliverables" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_invoice_id" ON "project_deliverables" ("invoice_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_workspace_project" FOREIGN KEY ("workspace_id","project_id") REFERENCES "projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_source_scope" FOREIGN KEY ("source_scope_id") REFERENCES "scope_analyses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
