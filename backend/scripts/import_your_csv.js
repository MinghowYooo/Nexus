import fs from 'fs';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection - update these with your Cloud SQL details
const pool = new Pool({
  host: '34.148.46.223', // Your Cloud SQL IP
  port: 5432,
  database: 'nexus_videos',
  user: 'nexus_user',
  password: 'nexus123!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Category mapping from your CSV
const categoryMap = {
  '1': 'Film & Animation',
  '2': 'Autos & Vehicles', 
  '10': 'Music',
  '15': 'Pets & Animals',
  '17': 'Sports',
  '19': 'Travel & Events',
  '20': 'Gaming',
  '22': 'People & Blogs',
  '23': 'Comedy',
  '24': 'Entertainment',
  '25': 'News & Politics',
  '26': 'Howto & Style',
  '27': 'Education',
  '28': 'Science & Technology'
};

async function importCSV() {
  const client = await pool.connect();
  
  try {
    console.log('Starting CSV import...');
    
    // Create table if not exists
    await client.query(`
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
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
      CREATE INDEX IF NOT EXISTS idx_videos_channel_name ON videos(channel_name);
      CREATE INDEX IF NOT EXISTS idx_videos_view_count ON videos(view_count DESC);
      CREATE INDEX IF NOT EXISTS idx_videos_daily_rank ON videos(daily_rank);
    `);
    
    console.log('Table created/verified');
    
    // Clear existing data
    await client.query('DELETE FROM videos');
    console.log('Cleared existing data');
    
    // Import CSV
    const csvPath = '../public/trending_yt_videos_US_only.csv';
    const records = [];
    let count = 0;
    
    const parser = createReadStream(csvPath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }));
    
    for await (const record of parser) {
      // Transform the data to match your database schema
      const videoData = {
        id: record.video_id,
        title: record.title,
        channel_name: record.channelTitle,
        channel_id: record.channelId,
        description: record.description,
        thumbnail_url: record.thumbnail_link,
        view_count: parseInt(record.view_count) || 0,
        like_count: parseInt(record.likes) || 0,
        comment_count: parseInt(record.comment_count) || 0,
        video_tags: record.tags ? record.tags.split('|') : [],
        category: categoryMap[record.categoryId] || 'Entertainment',
        publish_date: new Date(record.publishedAt),
        daily_rank: Math.floor(Math.random() * 100) + 1, // Random rank for demo
        daily_movement: Math.floor(Math.random() * 20) - 10,
        weekly_movement: Math.floor(Math.random() * 50) - 25,
        country: 'US',
        language: 'en'
      };
      
      records.push(videoData);
      count++;
      
      // Insert in batches of 100
      if (records.length >= 100) {
        await insertBatch(client, records);
        console.log(`Imported ${count} records...`);
        records.length = 0; // Clear array
      }
    }
    
    // Insert remaining records
    if (records.length > 0) {
      await insertBatch(client, records);
    }
    
    console.log(`CSV import completed! Total records: ${count}`);
    
    // Get count
    const result = await client.query('SELECT COUNT(*) as count FROM videos');
    console.log(`Total videos in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertBatch(client, records) {
  const values = records.map((record, index) => {
    const baseIndex = index * 16; // 16 columns
    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16})`;
  }).join(',');
  
  const query = `
    INSERT INTO videos (id, title, channel_name, channel_id, description, thumbnail_url, view_count, like_count, comment_count, video_tags, category, publish_date, daily_rank, daily_movement, weekly_movement, country, language)
    VALUES ${values}
    ON CONFLICT (id) DO NOTHING
  `;
  
  const params = records.flatMap(record => [
    record.id, record.title, record.channel_name, record.channel_id, record.description,
    record.thumbnail_url, record.view_count, record.like_count, record.comment_count,
    record.video_tags, record.category, record.publish_date, record.daily_rank,
    record.daily_movement, record.weekly_movement, record.country, record.language
  ]);
  
  await client.query(query, params);
}

// Run the import
importCSV().catch(console.error);
