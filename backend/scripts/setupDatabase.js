import { query, testConnection } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  try {
    console.log('🔧 Setting up database tables...');

    // Create videos table
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_channel_name ON videos(channel_name);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_view_count ON videos(view_count DESC);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_publish_date ON videos(publish_date DESC);
    `);

    // Create users table for recommendations
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user interactions table
    await query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        video_id VARCHAR(255) REFERENCES videos(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL, -- 'view', 'like', 'dislike', 'share'
        score INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id, interaction_type)
      )
    `);

    // Create indexes for user interactions
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_video_id ON user_interactions(video_id);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
    `);

    // Create video similarity table for content-based recommendations
    await query(`
      CREATE TABLE IF NOT EXISTS video_similarities (
        id SERIAL PRIMARY KEY,
        video_id_1 VARCHAR(255) REFERENCES videos(id) ON DELETE CASCADE,
        video_id_2 VARCHAR(255) REFERENCES videos(id) ON DELETE CASCADE,
        similarity_score FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id_1, video_id_2)
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_video_similarities_video_1 ON video_similarities(video_id_1);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_video_similarities_score ON video_similarities(similarity_score DESC);
    `);

    console.log('✅ Database tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const main = async () => {
  try {
    console.log('🚀 Starting database setup...');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Create tables
    await createTables();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run import-csv');
    console.log('2. Start the server: npm run dev');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
};

main();
