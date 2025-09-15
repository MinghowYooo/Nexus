import { query, testConnection } from '../config/database.js';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CSV file path
const CSV_PATH = join(__dirname, '../../US_youtube_trending_data.csv');

const parseCSVRow = (row) => {
  try {
    // Clean and validate the data
    const video = {
      id: row.video_id?.trim() || null,
      title: row.title?.trim() || null,
      channel_name: row.channelTitle?.trim() || null,
      channel_id: row.channelId?.trim() || null,
      description: row.description?.trim() || null,
      thumbnail_url: row.thumbnail_link?.trim() || null,
      view_count: parseInt(row.view_count) || 0,
      like_count: parseInt(row.likes) || 0,
      comment_count: parseInt(row.comment_count) || 0,
      video_tags: row.tags ? row.tags.split('|').map(tag => tag.trim()).filter(tag => tag) : [],
      category: mapCategoryId(row.categoryId),
      publish_date: row.publishedAt ? new Date(row.publishedAt) : null,
      daily_rank: null, // Not available in this dataset
      daily_movement: null,
      weekly_movement: null,
      country: 'US',
      language: 'en'
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

const mapCategoryId = (categoryId) => {
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
  return categoryMap[categoryId] || 'Entertainment';
};

const insertVideo = async (video) => {
  try {
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
      video.description, video.thumbnail_url, video.view_count, video.like_count,
      video.comment_count, video.video_tags, video.category, video.publish_date,
      video.daily_rank, video.daily_movement, video.weekly_movement,
      video.country, video.language
    ];

    await query(insertQuery, values);
    return true;
  } catch (error) {
    console.warn(`Failed to insert video ${video.id}:`, error.message);
    return false;
  }
};

const importCSV = async () => {
  try {
    console.log('📊 Starting large CSV import...');
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
    let batchSize = 1000;
    let batch = [];

    // Parse CSV with PapaParse
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        return header.trim().replace(/"/g, '');
      },
      step: async (result, parser) => {
        totalRows++;
        
        if (totalRows % 10000 === 0) {
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
            try {
              const success = await insertVideo(video);
              if (success) insertedRows++;
            } catch (error) {
              console.warn(`Failed to insert video ${video.id}:`, error.message);
            }
          }

          console.log('\n🎉 Import completed!');
          console.log(`📊 Total rows processed: ${totalRows}`);
          console.log(`✅ Valid videos: ${validRows}`);
          console.log(`💾 Successfully inserted: ${insertedRows}`);
          console.log(`❌ Failed inserts: ${validRows - insertedRows}`);
          
          process.exit(0);
        } catch (error) {
          console.error('Error processing final batch:', error);
          process.exit(1);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
};

importCSV();
