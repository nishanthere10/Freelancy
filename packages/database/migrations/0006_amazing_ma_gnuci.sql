DO $$ BEGIN
 CREATE TYPE "user_status" AS ENUM('active', 'suspended', 'deactivated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"image_url" varchar(512),
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"invoice_number" varchar(50),
	"sequence_number" integer,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_rate" numeric(5, 2) DEFAULT '0.00',
	"discount_amount" numeric(12, 2) DEFAULT '0.00',
	"taxable_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '18.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"total_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount_due" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"payment_method" varchar(50),
	"payment_reference" varchar(255),
	"notes" text,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"input_text" text NOT NULL,
	"result" jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_clerk_id" ON "users" ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice_id" ON "invoice_items" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_workspace_id" ON "invoices" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_client_id" ON "invoices" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_project_id" ON "invoices" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_workspace_id_id" ON "invoices" ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_workspace_number" ON "invoices" ("workspace_id","invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_events_workspace_created_at" ON "activity_events" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_events_workspace_entity" ON "activity_events" ("workspace_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_events_workspace_actor" ON "activity_events" ("workspace_id","actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scope_analyses_workspace_id" ON "scope_analyses" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scope_analyses_project_id" ON "scope_analyses" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scope_analyses_actor_user_id" ON "scope_analyses" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scope_analyses_created_at" ON "scope_analyses" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_projects_workspace_id_id" ON "projects" ("workspace_id","id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "fk_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "fk_invoice_items_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_workspace_client" FOREIGN KEY ("workspace_id","client_id") REFERENCES "clients"("workspace_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_workspace_project" FOREIGN KEY ("workspace_id","project_id") REFERENCES "projects"("workspace_id","id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scope_analyses" ADD CONSTRAINT "scope_analyses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scope_analyses" ADD CONSTRAINT "scope_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scope_analyses" ADD CONSTRAINT "scope_analyses_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
