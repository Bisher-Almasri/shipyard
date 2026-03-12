-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackclub_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    avatar VARCHAR,
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
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a few sample jobs
INSERT INTO jobs (title, description, points, deadline) VALUES
('Build a Weather Widget', 'Create a beautiful weather widget using any API. Show temperature, conditions, and forecast.', 100, NOW() + INTERVAL '6 days'),
('Fix the Bug Challenge', 'Debug and fix the provided code snippet to make the application run without errors.', 75, NOW() + INTERVAL '4 days'),
('API Design Challenge', 'Design a REST API structure for a todo application including endpoints, models, and docs.', 50, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Turn off RLS for development/internal server use since we do not have a service role key
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_redemptions DISABLE ROW LEVEL SECURITY;

create table projects (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references users(id) on delete cascade,

    title text not null,
    description text not null,
    header_img text,

    -- date bigint not null, -- unix timestamp
    time integer not null default 0,
    followers integer not null default 0,

    created_at timestamp with time zone default now()
);

-- dev log
create table posts (
    id uuid primary key default gen_random_uuid(),

    project_id uuid not null references projects(id) on delete cascade,

    title text not null,
    description text not null,
    attachment text default '',

    -- date bigint not null,
    likes integer not null default 0,

    created_at timestamp with time zone default now()
);


create index idx_posts_project_id on posts(project_id);

create index idx_posts_date on posts(created_at);
create index idx_projects_date on projects(created_at);

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
