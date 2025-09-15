import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Simple CSV parser for server-side use
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const videos = [];

  for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Limit to first 1000 videos for performance
    const line = lines[i].trim();
    if (!line) continue;

    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const video = {};
      headers.forEach((header, index) => {
        video[header] = values[index] ? values[index].replace(/"/g, '') : '';
      });
      videos.push(video);
    }
  }

  return videos;
}

// GET /api/csv/videos - Get videos from CSV file
router.get('/videos', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (parseInt(page) - 1) * limitNum;

    const csvPath = path.join(__dirname, '../../public/trending_yt_videos_US_only.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    const csvText = fs.readFileSync(csvPath, 'utf8');
    const allVideos = parseCSV(csvText);
    
    const paginatedVideos = allVideos.slice(offset, offset + limitNum);
    
    res.json({
      videos: paginatedVideos,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: allVideos.length,
        hasNext: offset + limitNum < allVideos.length
      }
    });
  } catch (error) {
    console.error('CSV endpoint error:', error);
    res.status(500).json({ error: 'Failed to load videos from CSV' });
  }
});

export default router;
