-- Create enum type for workspace roles
CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');

-- Create workspaces table
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  description text,
  logo varchar(512),
  owner_id uuid NOT NULL,
  settings text DEFAULT '{}',
  
  -- Audit columns
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp with time zone,
  
  CONSTRAINT workspace_slug_unique_not_deleted UNIQUE NULLS NOT DISTINCT (slug, deleted_at)
);

-- Create workspaces indexes
CREATE INDEX idx_workspace_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspace_slug ON workspaces(slug);

-- Create workspace_members table
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  invited_by uuid,
  left_at timestamp with time zone,
  
  -- Audit columns
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  
  CONSTRAINT workspace_members_unique UNIQUE NULLS NOT DISTINCT (workspace_id, user_id, deleted_at)
);

-- Create workspace_members indexes
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_unique ON workspace_members(workspace_id, user_id) WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE workspaces IS 'Represents a workspace that contains projects, invoices, and team members';
COMMENT ON COLUMN workspaces.slug IS 'URL-friendly identifier for the workspace, must be unique';
COMMENT ON COLUMN workspaces.owner_id IS 'UUID of the user who owns this workspace';
COMMENT ON COLUMN workspaces.settings IS 'JSON object containing workspace-specific settings';

COMMENT ON TABLE workspace_members IS 'Represents the membership of a user in a workspace';
COMMENT ON COLUMN workspace_members.role IS 'Role of the user in this workspace: owner, editor, or viewer';
COMMENT ON COLUMN workspace_members.left_at IS 'Timestamp when the user left the workspace (NULL if still active)';
