-- Migration: Add pause functionality to subscriptions
-- Purpose: Allow users to temporarily pause webhook deliveries without losing pending events
-- Date: 2024-12-08

-- Add IsPaused column with default value of false (0)
ALTER TABLE WebhookSubscriptions ADD COLUMN IsPaused INTEGER NOT NULL DEFAULT 0;

-- Add PausedAt timestamp column to track when subscription was paused
ALTER TABLE WebhookSubscriptions ADD COLUMN PausedAt TEXT NULL;
