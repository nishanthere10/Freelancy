-- Create enum type for invoice status
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure projects table has unique index on (workspace_id, id) for composite FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_workspace_id_id ON projects(workspace_id, id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  project_id uuid,

  -- Numbering & Status
  invoice_number varchar(50),
  sequence_number integer,
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Dates
  issue_date date,
  due_date date,
  paid_at timestamp with time zone,

  -- Financial Totals
  currency varchar(3) NOT NULL DEFAULT 'INR',
  subtotal numeric(12, 2) NOT NULL DEFAULT '0.00',
  discount_rate numeric(5, 2) DEFAULT '0.00',
  discount_amount numeric(12, 2) DEFAULT '0.00',
  taxable_amount numeric(12, 2) NOT NULL DEFAULT '0.00',
  tax_rate numeric(5, 2) DEFAULT '18.00',
  tax_amount numeric(12, 2) DEFAULT '0.00',
  total_amount numeric(12, 2) NOT NULL DEFAULT '0.00',
  amount_paid numeric(12, 2) NOT NULL DEFAULT '0.00',
  amount_due numeric(12, 2) NOT NULL DEFAULT '0.00',

  -- Payment Tracking Metadata
  payment_method varchar(50),
  payment_reference varchar(255),

  -- Content & Notes
  notes text,
  terms text,

  -- Audit
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  deleted_at timestamp with time zone,

  -- Composite Foreign Key Constraints
  CONSTRAINT fk_invoices_workspace_client FOREIGN KEY (workspace_id, client_id) REFERENCES clients (workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_workspace_project FOREIGN KEY (workspace_id, project_id) REFERENCES projects (workspace_id, id) ON DELETE SET NULL
);

-- Ensure invoices table has unique index on (workspace_id, id) for composite FK reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_workspace_id_id ON invoices(workspace_id, id);

-- Partial unique index for workspace-scoped invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_workspace_number ON invoices(workspace_id, invoice_number) WHERE invoice_number IS NOT NULL;

-- Create indexes on invoices
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT '1.00',
  unit_price numeric(12, 2) NOT NULL DEFAULT '0.00',
  amount numeric(12, 2) NOT NULL DEFAULT '0.00',
  sort_order integer NOT NULL DEFAULT 0
);

-- Create indexes on invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Comments
COMMENT ON TABLE invoices IS 'Represents financial invoices issued to clients within a workspace';
COMMENT ON TABLE invoice_items IS 'Represents line item entries belonging to an invoice';
