-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackclub_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    slack_name VARCHAR,
    email VARCHAR NOT NULL,
    avatar VARCHAR,
    address JSONB,
    birthday DATE,
    cargo_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table for Authentication mapping
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT,
    points INT NOT NULL,
    active boolean
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Jobs (Completed)
CREATE TABLE IF NOT EXISTS user_jobs (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, job_id)
);

-- Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT,
    cost INT NOT NULL,
    image_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Redemptions
CREATE TABLE IF NOT EXISTS user_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR DEFAULT 'pending'
);

-- Insert a few sample jobs
INSERT INTO jobs (title, description, points, deadline) VALUES
('Build a Weather Widget', 'Create a beautiful weather widget using any API. Show temperature, conditions, and forecast.', 100, NOW() + INTERVAL '6 days'),
('Fix the Bug Challenge', 'Debug and fix the provided code snippet to make the application run without errors.', 75, NOW() + INTERVAL '4 days'),
('API Design Challenge', 'Design a REST API structure for a todo application including endpoints, models, and docs.', 50, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_redemptions ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Policies
-- User profiles stay private; server-side routes use the service-role key.
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can be created (server or owner)" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own account" ON users FOR DELETE USING (auth.uid() = id);

-- 2. Sessions Table Policies
-- Only the owner can view or manage their sessions
-- Prevent client-side creation of sessions: session rows should be managed server-side.
CREATE POLICY "No client insert into sessions" ON sessions FOR INSERT USING (false) WITH CHECK (false);
CREATE POLICY "Users can view their own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON sessions FOR DELETE USING (auth.uid() = user_id);

-- 3. Jobs Table Policies
-- Everyone can view jobs
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);

-- 4. User Jobs Table Policies
-- Everyone can view completed jobs
CREATE POLICY "User jobs are viewable by owner only" ON user_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their job completions" ON user_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own job completions" ON user_jobs FOR DELETE USING (auth.uid() = user_id);

-- 5. Shop Items Table Policies
-- Everyone can view shop items
CREATE POLICY "Shop items are viewable by everyone" ON shop_items FOR SELECT USING (true);

-- 6. User Redemptions Table Policies
-- Everyone can view redemptions
CREATE POLICY "Users can view their own redemptions" ON user_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create a redemption for themselves" ON user_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own redemptions" ON user_redemptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own redemptions" ON user_redemptions FOR DELETE USING (auth.uid() = user_id);


create table projects (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references users(id) on delete cascade,

    title text not null,
    description text not null,
    header_img text,

    -- date bigint not null, -- unix timestamp
    time integer not null default 0,
    followers integer not null default 0,
    hackatime_projects text[] default '{}',

    repo_url text,
    playable_url text,
    multiplier numeric,
    status varchar default 'pending',
    review_stage varchar default 'first_round',
    selected_job_id uuid references jobs(id) on delete set null,
    payout_awarded_at timestamp with time zone,
    first_reviewer_slack_id text,
    final_reviewer_slack_id text,
    last_reviewer_message text,

    created_at timestamp with time zone default now()
);

-- dev log
create table posts (
    id uuid primary key default gen_random_uuid(),

    project_id uuid not null references projects(id) on delete cascade,

    title text not null,
    description text not null,
    attachment text default '',
    hours numeric default 0,

    -- date bigint not null,
    likes integer not null default 0,

    created_at timestamp with time zone default now()
);


create index idx_posts_project_id on posts(project_id);

create index idx_posts_date on posts(created_at);
create index idx_projects_date on projects(created_at);
create index idx_projects_review_stage on projects(review_stage);
create index idx_projects_payout_awarded_at on projects(payout_awarded_at);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

create index idx_comments_post_id on comments(post_id);
create index idx_post_likes_post_id on post_likes(post_id);


ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- 7. Projects Table Policies
-- Everyone can view projects
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects for themselves" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- 8. Posts Table Policies
-- Everyone can view posts
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Project owners can create posts" ON posts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = posts.project_id AND p.user_id = auth.uid()));
CREATE POLICY "Project owners can update/delete posts" ON posts FOR UPDATE USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = posts.project_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = posts.project_id AND p.user_id = auth.uid()));
CREATE POLICY "Project owners can delete posts" ON posts FOR DELETE USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = posts.project_id AND p.user_id = auth.uid()));

-- 9. Comments Table Policies
-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create their own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 10. Likes Table Policies
-- Everyone can view likes
CREATE POLICY "Likes are viewable by everyone" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like/unlike" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their like" ON post_likes FOR DELETE USING (auth.uid() = user_id);


-- Hackatime Connections
CREATE TABLE IF NOT EXISTS hackatime_connections (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hackatime_connections ENABLE ROW LEVEL SECURITY;

-- 9. Hackatime Connections Table Policies
-- Only the user can view/manage their connection data
CREATE POLICY "Users can manage their own Hackatime connections (select)" ON hackatime_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own Hackatime connection" ON hackatime_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own Hackatime connection" ON hackatime_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own Hackatime connection" ON hackatime_connections FOR DELETE USING (auth.uid() = user_id);

