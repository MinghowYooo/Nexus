import fs from 'fs';
import Papa from 'papaparse';
import { query, testConnection } from '../config/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CSV file path
const CSV_PATH = join(__dirname, '../../public/trending_yt_videos_US_only.csv');

const parseCSVRow = (row) => {
  try {
    // Clean and validate the data
    const video = {
      id: row.video_id?.trim() || null,
      title: row.title?.trim() || null,
      channel_name: row.channel_name?.trim() || null,
      channel_id: row.channel_id?.trim() || null,
      description: row.description?.trim() || null,
      thumbnail_url: row.thumbnail_url?.trim() || null,
      view_count: parseInt(row.view_count) || 0,
      like_count: parseInt(row.like_count) || 0,
      comment_count: parseInt(row.comment_count) || 0,
      video_tags: row.video_tags ? row.video_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      category: row.category?.trim() || 'Entertainment',
      publish_date: (() => {
        if (!row.publish_date || row.publish_date.includes('NaN') || row.publish_date.includes('Invalid')) return null;
        const date = new Date(row.publish_date);
        return isNaN(date.getTime()) ? null : date;
      })(),
      daily_rank: parseInt(row.daily_rank) || null,
      daily_movement: parseInt(row.daily_movement) || null,
      weekly_movement: parseInt(row.weekly_movement) || null,
      country: row.country?.trim() || 'US',
      language: row.language?.trim() || 'en'
    };

    // Validate required fields
    if (!video.id || !video.title || !video.channel_name) {
      return null;
    }

    return video;
  } catch (error) {
    console.warn('Error parsing row:', error.message);
    return null;
  }
};

const insertVideo = async (video) => {
  const insertQuery = `
    INSERT INTO videos (
      id, title, channel_name, channel_id, description, thumbnail_url,
      view_count, like_count, comment_count, video_tags, category,
      publish_date, daily_rank, daily_movement, weekly_movement,
      country, language
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      channel_name = EXCLUDED.channel_name,
      view_count = EXCLUDED.view_count,
      like_count = EXCLUDED.like_count,
      comment_count = EXCLUDED.comment_count,
      video_tags = EXCLUDED.video_tags,
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = [
    video.id, video.title, video.channel_name, video.channel_id,
    video.description, video.thumbnail_url, video.view_count,
    video.like_count, video.comment_count, video.video_tags,
    video.category, video.publish_date, video.daily_rank,
    video.daily_movement, video.weekly_movement, video.country, video.language
  ];

  try {
    await query(insertQuery, values);
    return true;
  } catch (error) {
    console.error('Error inserting video:', video.id, error.message);
    return false;
  }
};

const importCSV = async () => {
  try {
    console.log('📊 Starting CSV import with PapaParse...');
    console.log(`📁 Reading from: ${CSV_PATH}`);

    // Check if file exists
    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`CSV file not found at: ${CSV_PATH}`);
    }

    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Read the CSV file
    const csvData = fs.readFileSync(CSV_PATH, 'utf8');

    let totalRows = 0;
    let validRows = 0;
    let insertedRows = 0;
    let batchSize = 100;
    let batch = [];

    // Parse CSV with PapaParse
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Clean header names
        return header.trim().replace(/"/g, '');
      },
      step: async (result, parser) => {
        totalRows++;
        
        if (totalRows % 1000 === 0) {
          console.log(`📈 Processed ${totalRows} rows... (Valid: ${validRows}, Inserted: ${insertedRows})`);
        }

        const video = parseCSVRow(result.data);
        if (video) {
          validRows++;
          batch.push(video);

          // Process batch when it reaches batchSize
          if (batch.length >= batchSize) {
            const currentBatch = [...batch];
            batch = [];
            
            // Process batch
            for (const video of currentBatch) {
              try {
                const success = await insertVideo(video);
                if (success) insertedRows++;
              } catch (error) {
                console.warn(`Failed to insert video ${video.id}:`, error.message);
              }
            }
          }
        }
      },
      complete: async () => {
        try {
          // Process remaining batch
          for (const video of batch) {
            const success = await insertVideo(video);
            if (success) insertedRows++;
          }

          console.log('\n✅ CSV import completed!');
          console.log(`📊 Total rows processed: ${totalRows}`);
          console.log(`✅ Valid rows: ${validRows}`);
          console.log(`💾 Successfully inserted: ${insertedRows}`);
          console.log(`❌ Failed insertions: ${validRows - insertedRows}`);

          // Get final count
          const result = await query('SELECT COUNT(*) as count FROM videos');
          console.log(`🎯 Total videos in database: ${result.rows[0].count}`);

        } catch (error) {
          console.error('Error in completion:', error);
        }
      },
      error: (error) => {
        console.error('PapaParse error:', error);
      }
    });

  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await importCSV();
    console.log('\n🎉 Import process completed successfully!');
  } catch (error) {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  }
};

main();
