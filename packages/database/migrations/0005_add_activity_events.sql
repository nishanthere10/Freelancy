-- Create activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(100) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes on activity_events
CREATE INDEX IF NOT EXISTS idx_activity_events_workspace_created_at ON activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_workspace_entity ON activity_events(workspace_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_workspace_actor ON activity_events(workspace_id, actor_user_id, created_at DESC);

-- Comments
COMMENT ON TABLE activity_events IS 'Represents workspace-scoped business activity and audit trail entries';
