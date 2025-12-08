-- Migration: Add DemeterConfig table for runtime credential management
-- Date: 2025-12-08

-- Create DemeterConfigs table
CREATE TABLE IF NOT EXISTS DemeterConfigs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    GrpcEndpoint TEXT NOT NULL,
    ApiKeyEncrypted TEXT NOT NULL,
    Network TEXT NOT NULL DEFAULT 'Preprod',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    IsActive INTEGER NOT NULL DEFAULT 1
);

-- Create index for quickly finding active config
CREATE INDEX IF NOT EXISTS IX_DemeterConfigs_IsActive 
ON DemeterConfigs(IsActive);

-- Note: Only one active config should exist at a time
-- Application layer should enforce this constraint
