-- Audit log table for tracking all user actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,           -- e.g. 'campaign.launch', 'settings.update', 'auth.login', 'auth.logout'
  details JSONB DEFAULT '{}',     -- action-specific metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS: users can only read their own logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Also add missing indexes on existing tables for performance
CREATE INDEX IF NOT EXISTS idx_launch_history_user_id ON launch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_launch_history_launched_at ON launch_history(launched_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatives_user_id ON creatives(user_id);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON creatives(created_at DESC);
