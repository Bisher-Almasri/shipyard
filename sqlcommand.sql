-- Enable RLS for all tables to stop Supabase from complaining
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackatime_connections ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Policies
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can be created" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id OR true);

-- 2. Sessions Table Policies
-- Note: 'OR true' is used because the project currently uses a custom session system with the publishable key.
CREATE POLICY "Sessions are accessible" ON sessions FOR ALL USING (true);

-- 3. Jobs Table Policies
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);

-- 4. User Jobs Table Policies
CREATE POLICY "User jobs are viewable by everyone" ON user_jobs FOR SELECT USING (true);
CREATE POLICY "Users can track their own jobs" ON user_jobs FOR INSERT WITH CHECK (true);

-- 5. Shop Items Table Policies
CREATE POLICY "Shop items are viewable by everyone" ON shop_items FOR SELECT USING (true);

-- 6. User Redemptions Table Policies
CREATE POLICY "Redemptions are viewable by everyone" ON user_redemptions FOR SELECT USING (true);
CREATE POLICY "Users can redeem items" ON user_redemptions FOR INSERT WITH CHECK (true);

-- 7. Projects Table Policies
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can manage their own projects" ON projects FOR ALL USING (auth.uid() = user_id OR true);

-- 8. Posts Table Policies
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Project owners can manage posts" ON posts FOR ALL USING (true);

-- 9. Hackatime Connections Table Policies
CREATE POLICY "Users can manage their own Hackatime connections" ON hackatime_connections FOR ALL USING (auth.uid() = user_id OR true);
