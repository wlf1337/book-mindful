-- Add paused_duration_seconds and paused_at columns to reading_sessions
ALTER TABLE reading_sessions 
ADD COLUMN IF NOT EXISTS paused_duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;