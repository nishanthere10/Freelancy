-- Create enum types for project status and pricing model
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_model AS ENUM ('fixed', 'hourly', 'retainer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure clients table has unique index on (workspace_id, id) for composite FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_workspace_id_id ON clients(workspace_id, id);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid,
  
  -- Identity
  name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  description text,
  
  -- Status & Financials
  status project_status NOT NULL DEFAULT 'draft',
  pricing_model pricing_model NOT NULL DEFAULT 'fixed',
  budget_currency varchar(3) NOT NULL DEFAULT 'INR',
  budget_amount numeric(12, 2),
  
  -- Timeline
  start_date date,
  target_date date,
  completed_at timestamp with time zone,
  
  -- Audit
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  deleted_at timestamp with time zone,

  -- Constraints
  CONSTRAINT fk_projects_workspace_client FOREIGN KEY (workspace_id, client_id) REFERENCES clients (workspace_id, id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_workspace_slug ON projects(workspace_id, slug) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE projects IS 'Represents a project work agreement within a workspace and optional client';
