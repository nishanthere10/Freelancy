DO $$ BEGIN
 CREATE TYPE "change_order_status" AS ENUM('draft', 'approved', 'rejected', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"scope_analysis_id" uuid NOT NULL,
	"drift_analysis_id" uuid,
	"invoice_id" uuid,
	"change_order_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "change_order_status" DEFAULT 'draft' NOT NULL,
	"additional_budget" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"additional_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"timeline_delta_days" integer DEFAULT 0 NOT NULL,
	"proposed_deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_workspace_id" ON "change_orders" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_project_id" ON "change_orders" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_status" ON "change_orders" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_invoice_id" ON "change_orders" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_scope_analysis_id" ON "change_orders" ("scope_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_drift_analysis_id" ON "change_orders" ("drift_analysis_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_workspace_project" FOREIGN KEY ("workspace_id","project_id") REFERENCES "projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_scope_analysis" FOREIGN KEY ("scope_analysis_id") REFERENCES "scope_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_drift_analysis" FOREIGN KEY ("drift_analysis_id") REFERENCES "drift_analyses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_orders" ADD CONSTRAINT "fk_change_orders_approved_by_user" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "project_deliverables" ADD COLUMN IF NOT EXISTS "change_order_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_change_order_id" ON "project_deliverables" ("change_order_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_change_order" FOREIGN KEY ("change_order_id") REFERENCES "change_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
