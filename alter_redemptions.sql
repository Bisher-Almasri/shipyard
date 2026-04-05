ALTER TABLE user_redemptions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
