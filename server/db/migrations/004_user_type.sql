ALTER TABLE users ADD COLUMN user_type TEXT NOT NULL DEFAULT 'local' CHECK (user_type IN ('local', 'plex'));
UPDATE users SET user_type = 'plex' WHERE plex_id IS NOT NULL;
