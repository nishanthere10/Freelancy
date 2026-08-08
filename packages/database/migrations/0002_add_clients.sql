-- Create enum type for client status
DO $$ BEGIN
  CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Identity
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50),
  website varchar(255),
  
  -- Company
  company_name varchar(255),
  gst_number varchar(50),
  contact_person varchar(255),
  department varchar(255),
  
  -- Address
  address text,
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100) DEFAULT 'IN',
  
  -- Status
  status client_status NOT NULL DEFAULT 'active',
  
  -- Audit
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamp with time zone
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_workspace_email ON clients(workspace_id, email) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE clients IS 'Represents a client within a workspace';
