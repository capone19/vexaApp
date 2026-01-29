-- Add display_currency column to tenants table
ALTER TABLE tenants 
ADD COLUMN display_currency text DEFAULT 'USD' 
CHECK (display_currency IN ('CLP', 'BOB', 'USD'));