-- Migration: Add md5sum column to documents table
-- This script should be run when the database is available

-- Add md5sum column
ALTER TABLE documents ADD COLUMN md5sum VARCHAR(32);

-- Create index for md5sum
CREATE INDEX idx_documents_md5sum ON documents(md5sum);

-- For existing documents, we'll need to calculate MD5 hashes
-- This would need to be done programmatically since we need the file content
-- For now, we'll set a placeholder value
UPDATE documents SET md5sum = 'migration_placeholder' WHERE md5sum IS NULL;

-- Make md5sum NOT NULL after setting placeholder values
ALTER TABLE documents ALTER COLUMN md5sum SET NOT NULL;

-- Note: After running this migration, you should run a script to calculate
-- actual MD5 hashes for existing documents if needed
