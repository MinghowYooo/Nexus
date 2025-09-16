-- Create the videos table to match your CSV structure
CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(20) PRIMARY KEY,
    title TEXT NOT NULL,
    channel_name VARCHAR(255),
    channel_id VARCHAR(50),
    description TEXT,
    thumbnail_url TEXT,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    video_tags TEXT[],
    category VARCHAR(100),
    publish_date TIMESTAMP,
    daily_rank INTEGER,
    daily_movement INTEGER,
    weekly_movement INTEGER,
    country VARCHAR(10),
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_channel_name ON videos(channel_name);
CREATE INDEX IF NOT EXISTS idx_videos_view_count ON videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_daily_rank ON videos(daily_rank);
CREATE INDEX IF NOT EXISTS idx_videos_publish_date ON videos(publish_date);

-- Clear existing data
DELETE FROM videos;

-- Category mapping from your CSV
-- 1: Film & Animation, 2: Autos & Vehicles, 10: Music, 15: Pets & Animals
-- 17: Sports, 19: Travel & Events, 20: Gaming, 22: People & Blogs
-- 23: Comedy, 24: Entertainment, 25: News & Politics, 26: Howto & Style
-- 27: Education, 28: Science & Technology

-- We'll need to import the CSV data using a different method
-- This SQL just sets up the table structure
