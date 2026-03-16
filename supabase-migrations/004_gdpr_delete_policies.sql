-- GDPR: Allow users to delete their own data for account deletion

-- audit_logs: add DELETE policy
CREATE POLICY "Users can delete own audit logs"
  ON audit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- user_settings: add DELETE policy (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can delete own settings'
  ) THEN
    CREATE POLICY "Users can delete own settings"
      ON user_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- launch_history: add DELETE policy (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'launch_history' AND policyname = 'Users can delete own launch history'
  ) THEN
    CREATE POLICY "Users can delete own launch history"
      ON launch_history FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- creatives: add DELETE policy (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creatives' AND policyname = 'Users can delete own creatives'
  ) THEN
    CREATE POLICY "Users can delete own creatives"
      ON creatives FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
