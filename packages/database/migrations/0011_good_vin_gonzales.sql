DO $$ BEGIN
 CREATE TYPE "automation_action_run_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "automation_event_status" AS ENUM('pending', 'dispatched', 'failed', 'dead_lettered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "automation_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'skipped', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "automation_status" AS ENUM('draft', 'active', 'paused', 'error', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "automation_trigger_type" AS ENUM('event', 'schedule');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "change_order_status" AS ENUM('draft', 'approved', 'rejected', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communication_channel" AS ENUM('email', 'whatsapp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communication_channel_status" AS ENUM('active', 'inactive', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communication_direction" AS ENUM('outbound', 'inbound');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communication_message_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'received', 'failed', 'bounced');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "communication_provider" AS ENUM('resend', 'wa_akg', 'meta_whatsapp', 'mock');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
	"change_order_id" uuid,
	"invoice_id" uuid,
	"billed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE IF NOT EXISTS "communication_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"provider" "communication_provider" NOT NULL,
	"status" "communication_channel_status" DEFAULT 'active' NOT NULL,
	"sender_identity" varchar(255),
	"display_name" varchar(255),
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"message_id" uuid,
	"provider" "communication_provider" NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"invoice_id" uuid,
	"change_order_id" uuid,
	"channel" "communication_channel" NOT NULL,
	"direction" "communication_direction" DEFAULT 'outbound' NOT NULL,
	"provider" "communication_provider" NOT NULL,
	"provider_message_id" varchar(255),
	"provider_thread_id" varchar(255),
	"recipient_address" varchar(255) NOT NULL,
	"sender_address" varchar(255),
	"subject" varchar(500),
	"body_text" text NOT NULL,
	"body_html" text,
	"template_key" varchar(100),
	"template_variables" jsonb DEFAULT '{}'::jsonb,
	"status" "communication_message_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"idempotency_key" varchar(255) NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT true NOT NULL,
	"project_updates" boolean DEFAULT true NOT NULL,
	"invoice_notifications" boolean DEFAULT true NOT NULL,
	"change_order_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_action_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"automation_run_id" uuid NOT NULL,
	"action_index" integer NOT NULL,
	"action_type" text NOT NULL,
	"status" "automation_action_run_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "automation_event_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"automation_id" uuid NOT NULL,
	"automation_event_id" uuid,
	"n8n_execution_id" text,
	"status" "automation_run_status" DEFAULT 'queued' NOT NULL,
	"trigger_source" text NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "automation_status" DEFAULT 'draft' NOT NULL,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"condition_config" jsonb NOT NULL,
	"action_config" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"definition_version" integer DEFAULT 1 NOT NULL,
	"definition_hash" text NOT NULL,
	"n8n_workflow_id" text,
	"n8n_workflow_version" text,
	"last_compiled_at" timestamp with time zone,
	"last_activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_workspace_id" ON "project_deliverables" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_project_id" ON "project_deliverables" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_status" ON "project_deliverables" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_invoice_id" ON "project_deliverables" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_project_deliverables_change_order_id" ON "project_deliverables" ("change_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_workspace_id" ON "change_orders" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_project_id" ON "change_orders" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_status" ON "change_orders" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_invoice_id" ON "change_orders" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_scope_analysis_id" ON "change_orders" ("scope_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_change_orders_drift_analysis_id" ON "change_orders" ("drift_analysis_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_channels_workspace_id" ON "communication_channels" ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_channels_workspace_channel" ON "communication_channels" ("workspace_id","channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_events_workspace_id" ON "communication_events" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_events_message_id" ON "communication_events" ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_events_provider_event" ON "communication_events" ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_workspace_created" ON "communication_messages" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_client_created" ON "communication_messages" ("workspace_id","client_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_project_created" ON "communication_messages" ("workspace_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_invoice" ON "communication_messages" ("workspace_id","invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_change_order" ON "communication_messages" ("workspace_id","change_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_provider_msg_id" ON "communication_messages" ("workspace_id","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_messages_idempotency" ON "communication_messages" ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_preferences_workspace_id" ON "communication_preferences" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_preferences_client_id" ON "communication_preferences" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_preferences_workspace_client" ON "communication_preferences" ("workspace_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_automation_action_runs_run_action_uq" ON "automation_action_runs" ("automation_run_id","action_index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_automation_action_runs_workspace_idempotency_uq" ON "automation_action_runs" ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_events_workspace" ON "automation_events" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_events_status_next" ON "automation_events" ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_events_type_occurred" ON "automation_events" ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_runs_workspace_automation" ON "automation_runs" ("workspace_id","automation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_runs_workspace_status" ON "automation_runs" ("workspace_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_runs_automation" ON "automation_runs" ("automation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_runs_n8n_execution" ON "automation_runs" ("n8n_execution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automations_workspace_status" ON "automations" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automations_workspace_created" ON "automations" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automations_workspace_trigger" ON "automations" ("workspace_id","trigger_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automations_workspace_n8n" ON "automations" ("workspace_id","n8n_workflow_id");--> statement-breakpoint
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
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_change_order" FOREIGN KEY ("change_order_id") REFERENCES "change_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_deliverables" ADD CONSTRAINT "fk_project_deliverables_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
DO $$ BEGIN
 ALTER TABLE "communication_channels" ADD CONSTRAINT "fk_comm_channels_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_channels" ADD CONSTRAINT "fk_comm_channels_created_by_user" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_events" ADD CONSTRAINT "fk_comm_events_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_events" ADD CONSTRAINT "fk_comm_events_message" FOREIGN KEY ("message_id") REFERENCES "communication_messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_messages" ADD CONSTRAINT "fk_comm_messages_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_messages" ADD CONSTRAINT "fk_comm_messages_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_messages" ADD CONSTRAINT "fk_comm_messages_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_messages" ADD CONSTRAINT "fk_comm_messages_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_messages" ADD CONSTRAINT "fk_comm_messages_change_order" FOREIGN KEY ("change_order_id") REFERENCES "change_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_preferences" ADD CONSTRAINT "fk_comm_preferences_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_preferences" ADD CONSTRAINT "fk_comm_preferences_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_action_runs" ADD CONSTRAINT "automation_action_runs_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_action_runs" ADD CONSTRAINT "automation_action_runs_automation_run_id_fk" FOREIGN KEY ("automation_run_id") REFERENCES "automation_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_fk" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_event_id_fk" FOREIGN KEY ("automation_event_id") REFERENCES "automation_events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
