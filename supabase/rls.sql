-- =========================================
-- EMERGENCY SECURITY FIX
-- =========================================

BEGIN;

-- =========================================
-- REMOVE ALL EXISTING POLICIES
-- =========================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I;',
            r.policyname,
            r.schemaname,
            r.tablename
        );
    END LOOP;
END $$;

-- =========================================
-- ENSURE RLS ENABLED
-- =========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackatime_connections ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USERS
-- =========================================

-- Public read only
CREATE POLICY users_select
ON users
FOR SELECT
USING (true);

-- Users update themselves only
CREATE POLICY users_update_own
ON users
FOR UPDATE
USING (auth.uid() = id);

-- Users insert themselves only
CREATE POLICY users_insert_own
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- =========================================
-- SESSIONS
-- =========================================

CREATE POLICY sessions_select_own
ON sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY sessions_insert_own
ON sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_delete_own
ON sessions
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================
-- JOBS
-- =========================================

CREATE POLICY jobs_select
ON jobs
FOR SELECT
USING (true);

-- =========================================
-- USER JOBS
-- =========================================

CREATE POLICY user_jobs_select
ON user_jobs
FOR SELECT
USING (true);

CREATE POLICY user_jobs_insert_own
ON user_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =========================================
-- SHOP ITEMS
-- =========================================

CREATE POLICY shop_items_select
ON shop_items
FOR SELECT
USING (true);

-- =========================================
-- USER REDEMPTIONS
-- =========================================

CREATE POLICY redemptions_select_own
ON user_redemptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY redemptions_insert_own
ON user_redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =========================================
-- PROJECTS
-- =========================================

CREATE POLICY projects_select
ON projects
FOR SELECT
USING (true);

CREATE POLICY projects_insert_own
ON projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_update_own
ON projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY projects_delete_own
ON projects
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================
-- POSTS
-- =========================================

CREATE POLICY posts_select
ON posts
FOR SELECT
USING (true);

CREATE POLICY posts_insert_own
ON posts
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM projects
        WHERE projects.id = posts.project_id
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY posts_update_own
ON posts
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM projects
        WHERE projects.id = posts.project_id
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY posts_delete_own
ON posts
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM projects
        WHERE projects.id = posts.project_id
        AND projects.user_id = auth.uid()
    )
);

-- =========================================
-- COMMENTS
-- =========================================

CREATE POLICY comments_select
ON comments
FOR SELECT
USING (true);

CREATE POLICY comments_insert_own
ON comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY comments_update_own
ON comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY comments_delete_own
ON comments
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================
-- POST LIKES
-- =========================================

CREATE POLICY likes_select
ON post_likes
FOR SELECT
USING (true);

CREATE POLICY likes_insert_own
ON post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY likes_delete_own
ON post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================
-- HACKATIME CONNECTIONS
-- =========================================

CREATE POLICY hackatime_select_own
ON hackatime_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY hackatime_insert_own
ON hackatime_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY hackatime_update_own
ON hackatime_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY hackatime_delete_own
ON hackatime_connections
FOR DELETE
USING (auth.uid() = user_id);

COMMIT;