import { query, testConnection } from '../config/database.js';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CSV file path
const CSV_PATH = join(__dirname, '../../US_youtube_trending_data.csv');

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

const parseCSVLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  fields.push(current);
  return fields.map(field => field.trim());
};

const importCSV = async () => {
  try {
    console.log('📊 Starting fast CSV import...');
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
    const lines = csvData.split('\n');
    const header = parseCSVLine(lines[0]);
    
    console.log(`📋 Header: ${header.join(', ')}`);
    console.log(`📄 Total lines: ${lines.length}`);

    let totalRows = 0;
    let validRows = 0;
    let insertedRows = 0;
    let batchSize = 500;
    let batch = [];

    // Clear existing data
    console.log('🗑️  Clearing existing videos...');
    await query('DELETE FROM videos');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      totalRows++;
      
      if (totalRows % 10000 === 0) {
        console.log(`📈 Processed ${totalRows} rows... (Valid: ${validRows}, Inserted: ${insertedRows})`);
      }

      try {
        const fields = parseCSVLine(line);
        if (fields.length < 16) continue;

        const video = {
          id: fields[0]?.replace(/"/g, '') || null,
          title: fields[1]?.replace(/"/g, '') || null,
          channel_name: fields[4]?.replace(/"/g, '') || null,
          channel_id: fields[3]?.replace(/"/g, '') || null,
          description: fields[15]?.replace(/"/g, '') || null,
          thumbnail_url: fields[12]?.replace(/"/g, '') || null,
          view_count: parseInt(fields[8]) || 0,
          like_count: parseInt(fields[9]) || 0,
          comment_count: parseInt(fields[11]) || 0,
          video_tags: fields[7] ? fields[7].split('|').map(tag => tag.trim()).filter(tag => tag) : [],
          category: mapCategoryId(fields[5]),
          publish_date: fields[2] ? new Date(fields[2]) : null,
          daily_rank: null,
          daily_movement: null,
          weekly_movement: null,
          country: 'US',
          language: 'en'
        };

        // Validate required fields
        if (video.id && video.title && video.channel_name) {
          validRows++;
          batch.push(video);

          // Process batch when it reaches batchSize
          if (batch.length >= batchSize) {
            const currentBatch = [...batch];
            batch = [];
            
            // Insert batch with UPSERT
            const insertQuery = `
              INSERT INTO videos (
                id, title, channel_name, channel_id, description, thumbnail_url,
                view_count, like_count, comment_count, video_tags, category,
                publish_date, daily_rank, daily_movement, weekly_movement,
                country, language
              ) VALUES ${currentBatch.map((_, i) => 
                `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`
              ).join(', ')}
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                channel_name = EXCLUDED.channel_name,
                view_count = EXCLUDED.view_count,
                like_count = EXCLUDED.like_count,
                comment_count = EXCLUDED.comment_count,
                video_tags = EXCLUDED.video_tags,
                updated_at = CURRENT_TIMESTAMP
            `;

            const values = currentBatch.flatMap(video => [
              video.id, video.title, video.channel_name, video.channel_id,
              video.description, video.thumbnail_url, video.view_count, video.like_count,
              video.comment_count, video.video_tags, video.category, video.publish_date,
              video.daily_rank, video.daily_movement, video.weekly_movement,
              video.country, video.language
            ]);

            try {
              await query(insertQuery, values);
              insertedRows += currentBatch.length;
            } catch (error) {
              console.warn(`Batch insert failed:`, error.message);
            }
          }
        }
      } catch (error) {
        // Skip malformed rows
        continue;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const insertQuery = `
        INSERT INTO videos (
          id, title, channel_name, channel_id, description, thumbnail_url,
          view_count, like_count, comment_count, video_tags, category,
          publish_date, daily_rank, daily_movement, weekly_movement,
          country, language
        ) VALUES ${batch.map((_, i) => 
          `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`
        ).join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          channel_name = EXCLUDED.channel_name,
          view_count = EXCLUDED.view_count,
          like_count = EXCLUDED.like_count,
          comment_count = EXCLUDED.comment_count,
          video_tags = EXCLUDED.video_tags,
          updated_at = CURRENT_TIMESTAMP
      `;

      const values = batch.flatMap(video => [
        video.id, video.title, video.channel_name, video.channel_id,
        video.description, video.thumbnail_url, video.view_count, video.like_count,
        video.comment_count, video.video_tags, video.category, video.publish_date,
        video.daily_rank, video.daily_movement, video.weekly_movement,
        video.country, video.language
      ]);

      try {
        await query(insertQuery, values);
        insertedRows += batch.length;
      } catch (error) {
        console.warn(`Final batch insert failed:`, error.message);
      }
    }

    console.log('\n🎉 Import completed!');
    console.log(`📊 Total rows processed: ${totalRows}`);
    console.log(`✅ Valid videos: ${validRows}`);
    console.log(`💾 Successfully inserted: ${insertedRows}`);
    console.log(`❌ Failed inserts: ${validRows - insertedRows}`);

  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
};

importCSV();
