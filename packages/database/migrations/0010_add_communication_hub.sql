DO $$ BEGIN
 CREATE TYPE "communication_channel" AS ENUM('email', 'whatsapp');
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
 CREATE TYPE "communication_message_status" AS ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'received', 'failed', 'bounced');
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
 CREATE TYPE "communication_channel_status" AS ENUM('active', 'inactive', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
CREATE INDEX IF NOT EXISTS "idx_comm_channels_workspace_id" ON "communication_channels" ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_channels_workspace_channel" ON "communication_channels" ("workspace_id", "channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_workspace_created" ON "communication_messages" ("workspace_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_client_created" ON "communication_messages" ("workspace_id", "client_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_project_created" ON "communication_messages" ("workspace_id", "project_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_invoice" ON "communication_messages" ("workspace_id", "invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_change_order" ON "communication_messages" ("workspace_id", "change_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_messages_provider_msg_id" ON "communication_messages" ("workspace_id", "provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_messages_idempotency" ON "communication_messages" ("workspace_id", "idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_events_workspace_id" ON "communication_events" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_events_message_id" ON "communication_events" ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_events_provider_event" ON "communication_events" ("provider", "provider_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_preferences_workspace_id" ON "communication_preferences" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_preferences_client_id" ON "communication_preferences" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_preferences_workspace_client" ON "communication_preferences" ("workspace_id", "client_id");--> statement-breakpoint
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
