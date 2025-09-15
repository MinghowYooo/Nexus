import { query, testConnection } from '../config/database.js';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CSV file path
const CSV_PATH = join(__dirname, '../../public/trending_yt_videos_US_only.csv');

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
    console.log('📊 Starting CSV import from trending_yt_videos_US_only.csv...');
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
    let seenIds = new Set();

    // Clear existing data
    console.log('🗑️  Clearing existing videos...');
    await query('DELETE FROM videos');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      totalRows++;
      
      if (totalRows % 1000 === 0) {
        console.log(`📈 Processed ${totalRows} rows... (Valid: ${validRows}, Inserted: ${insertedRows})`);
      }

      try {
        const fields = parseCSVLine(line);
        if (fields.length < 18) continue;

        const video = {
          id: fields[12]?.replace(/"/g, '') || null, // video_id
          title: fields[0]?.replace(/"/g, '') || null, // title
          channel_name: fields[1]?.replace(/"/g, '') || null, // channel_name
          channel_id: fields[13]?.replace(/"/g, '') || null, // channel_id
          description: fields[10]?.replace(/"/g, '') || null, // description
          thumbnail_url: fields[11]?.replace(/"/g, '') || null, // thumbnail_url
          view_count: parseInt(fields[7]) || 0, // view_count
          like_count: parseInt(fields[8]) || 0, // like_count
          comment_count: parseInt(fields[9]) || 0, // comment_count
          video_tags: fields[14] ? fields[14].split(',').map(tag => tag.trim()).filter(tag => tag) : [], // video_tags
          category: 'Entertainment', // Default category
          publish_date: fields[16] ? new Date(fields[16]) : null, // publish_date
          daily_rank: parseInt(fields[2]) || null, // daily_rank
          daily_movement: parseInt(fields[3]) || null, // daily_movement
          weekly_movement: parseInt(fields[4]) || null, // weekly_movement
          country: 'US',
          language: 'en'
        };

        // Validate required fields and check for duplicates
        if (video.id && video.title && video.channel_name && !seenIds.has(video.id)) {
          seenIds.add(video.id);
          validRows++;

          // Insert individual video
          const insertQuery = `
            INSERT INTO videos (
              id, title, channel_name, channel_id, description, thumbnail_url,
              view_count, like_count, comment_count, video_tags, category,
              publish_date, daily_rank, daily_movement, weekly_movement,
              country, language
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `;

          const values = [
            video.id, video.title, video.channel_name, video.channel_id,
            video.description, video.thumbnail_url, video.view_count, video.like_count,
            video.comment_count, video.video_tags, video.category, video.publish_date,
            video.daily_rank, video.daily_movement, video.weekly_movement,
            video.country, video.language
          ];

          try {
            await query(insertQuery, values);
            insertedRows++;
          } catch (error) {
            console.warn(`Failed to insert video ${video.id}:`, error.message);
          }
        }
      } catch (error) {
        // Skip malformed rows
        continue;
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
