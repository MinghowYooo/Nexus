import { query, testConnection } from '../config/database.js';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CSV file path
const CSV_PATH = join(__dirname, '../../archive/US_youtube_trending_data.csv');

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
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  
  return fields;
};

const parseVideo = (fields) => {
  try {
    const video = {
      id: fields[0]?.trim() || null,
      title: fields[1]?.trim() || null,
      channel_name: fields[4]?.trim() || null,
      channel_id: fields[3]?.trim() || null,
      description: fields[15]?.trim() || null,
      thumbnail_url: fields[12]?.trim() || null,
      view_count: parseInt(fields[8]) || 0,
      like_count: parseInt(fields[9]) || 0,
      comment_count: parseInt(fields[11]) || 0,
      video_tags: fields[7]?.split('|').map(tag => tag.trim()).filter(tag => tag) || [],
      category: mapCategoryId(fields[5]),
      publish_date: fields[2] ? new Date(fields[2]) : new Date(),
      daily_rank: 0,
      daily_movement: 0,
      weekly_movement: 0,
      country: 'US',
      language: 'en'
    };

    // Validate required fields
    if (!video.id || !video.title || !video.channel_name) {
      return null;
    }

    return video;
  } catch (error) {
    console.error('Error parsing video:', error);
    return null;
  }
};

const main = async () => {
  try {
    console.log('🚀 Starting diverse data import...');
    
    // Test database connection
    await testConnection();
    console.log('✅ Database connected');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await query('DELETE FROM videos');
    console.log('✅ Existing data cleared');

    // Read and parse CSV
    console.log('📄 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length} lines in CSV`);
    
    // Skip header
    const dataLines = lines.slice(1);
    console.log(`📊 Processing ${dataLines.length} data lines...`);

    const batchSize = 100;
    let processed = 0;
    let imported = 0;
    let batch = [];

    for (const line of dataLines) {
      if (line.trim() === '') continue;
      
      const fields = parseCSVLine(line);
      if (fields.length < 16) continue; // Skip malformed lines
      
      const video = parseVideo(fields);
      if (!video) continue;
      
      batch.push(video);
      processed++;
      
      if (batch.length >= batchSize) {
        // Insert batch
        const insertQuery = `
          INSERT INTO videos (
            id, title, channel_name, channel_id, description, thumbnail_url,
            view_count, like_count, comment_count, video_tags, category,
            publish_date, daily_rank, daily_movement, weekly_movement,
            country, language
          ) VALUES ${batch.map((_, i) => 
            `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`
          ).join(', ')}
        `;
        
        const values = batch.flatMap(v => [
          v.id, v.title, v.channel_name, v.channel_id, v.description, v.thumbnail_url,
          v.view_count, v.like_count, v.comment_count, v.video_tags, v.category,
          v.publish_date, v.daily_rank, v.daily_movement, v.weekly_movement,
          v.country, v.language
        ]);
        
        try {
          await query(insertQuery, values);
          imported += batch.length;
          console.log(`✅ Imported batch: ${imported} videos total`);
        } catch (error) {
          console.error('❌ Error inserting batch:', error.message);
        }
        
        batch = [];
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
      `;
      
      const values = batch.flatMap(v => [
        v.id, v.title, v.channel_name, v.channel_id, v.description, v.thumbnail_url,
        v.view_count, v.like_count, v.comment_count, v.video_tags, v.category,
        v.publish_date, v.daily_rank, v.daily_movement, v.weekly_movement,
        v.country, v.language
      ]);
      
      try {
        await query(insertQuery, values);
        imported += batch.length;
        console.log(`✅ Imported final batch: ${imported} videos total`);
      } catch (error) {
        console.error('❌ Error inserting final batch:', error.message);
      }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Processed: ${processed} lines`);
    console.log(`✅ Imported: ${imported} videos`);
    
    // Show category distribution
    const categoryQuery = 'SELECT category, COUNT(*) as count FROM videos GROUP BY category ORDER BY count DESC';
    const categoryResult = await query(categoryQuery);
    console.log('\n📈 Category distribution:');
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} videos`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
  }
};

main();
