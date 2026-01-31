-- Migration: 007_create-job-execution-logs.sql
-- Description: Create job execution logs table for tracking background job runs
-- Date: 2026-01-19

-- Job execution logs table for tracking job runs
CREATE TABLE IF NOT EXISTS job_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_seconds INTEGER,
  message TEXT,
  error_details TEXT,
  triggered_by TEXT -- 'scheduler', 'manual', or user_id
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_execution_logs(started_at);
