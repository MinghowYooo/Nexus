-- Create the videos table
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

-- Insert sample data (we'll add more later)
INSERT INTO videos (id, title, channel_name, channel_id, description, thumbnail_url, view_count, like_count, comment_count, video_tags, category, publish_date, daily_rank, daily_movement, weekly_movement, country, language) VALUES
('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)', 'Rick Astley', 'UCuAXFkgsw1L7xaCfnd5JJOw', 'The official video for "Never Gonna Give You Up" by Rick Astley', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 1234567890, 15000000, 2000000, ARRAY['music', 'pop', '80s', 'rickroll'], 'Music', '2009-10-25T06:57:33Z', 1, 0, 0, 'US', 'en'),
('jNQXAC9IVRw', 'Me at the zoo', 'jawed', 'UC4QobU6STFB0P71PMvJK_Ng', 'The first video ever uploaded to YouTube', 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg', 250000000, 5000000, 1000000, ARRAY['zoo', 'elephant', 'first video', 'youtube'], 'People & Blogs', '2005-04-23T20:33:48Z', 2, 0, 0, 'US', 'en'),
('kJQP7kiw5Fk', 'Luis Fonsi - Despacito ft. Daddy Yankee', 'Luis Fonsi', 'UCvCwDdX4NQy5Luj0BcGEMaQ', 'Luis Fonsi Despacito ft. Daddy Yankee', 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg', 8000000000, 50000000, 8000000, ARRAY['despacito', 'luis fonsi', 'daddy yankee', 'reggaeton'], 'Music', '2017-01-12T23:00:00Z', 3, 0, 0, 'US', 'es'),
('YQHsXMglC9A', 'Adele - Hello', 'AdeleVEVO', 'UComPKehI6Q8c8UFH6s-7P9w', 'Adele - Hello (Official Music Video)', 'https://i.ytimg.com/vi/YQHsXMglC9A/maxresdefault.jpg', 3500000000, 25000000, 3000000, ARRAY['adele', 'hello', 'music', 'ballad'], 'Music', '2015-10-22T23:00:00Z', 4, 0, 0, 'US', 'en'),
('9bZkp7q19f0', 'PSY - GANGNAM STYLE (강남스타일) M/V', 'officialpsy', 'UCrDkAvwZum-UTjHmzDI2iIw', 'PSY - GANGNAM STYLE (강남스타일) M/V', 'https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg', 4500000000, 30000000, 5000000, ARRAY['psy', 'gangnam style', 'k-pop', 'dance'], 'Music', '2012-07-15T07:00:00Z', 5, 0, 0, 'KR', 'ko')
ON CONFLICT (id) DO NOTHING;
