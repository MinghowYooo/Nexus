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
    
    // Shuffle videos to get different results on each load using Fisher-Yates shuffle
    const shuffledVideos = [...allVideos];
    for (let i = shuffledVideos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledVideos[i], shuffledVideos[j]] = [shuffledVideos[j], shuffledVideos[i]];
    }
    const paginatedVideos = shuffledVideos.slice(offset, offset + limitNum);
    
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

// GET /api/csv/search - Search videos in CSV
router.get('/search', async (req, res) => {
  try {
    const { q: searchQuery, limit = 20, page = 1 } = req.query;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const csvPath = path.join(__dirname, '../../public/trending_yt_videos_US_only.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    const csvText = fs.readFileSync(csvPath, 'utf8');
    const allVideos = parseCSV(csvText);
    
    // Improved search with relevance scoring
    const searchTerm = searchQuery.toLowerCase();
    const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
    
    const scoredVideos = allVideos.map(video => {
      const title = (video.title || '').toLowerCase();
      const description = (video.description || '').toLowerCase();
      const channel = (video.channelTitle || '').toLowerCase();
      const tags = (video.tags || '').toLowerCase();
      
      let score = 0;
      
      // Exact title match gets highest score
      if (title.includes(searchTerm)) {
        score += 100;
      }
      
      // Title word matches get high score
      searchWords.forEach(word => {
        if (title.includes(word)) {
          score += 50;
        }
      });
      
      // Channel name match gets medium score
      if (channel.includes(searchTerm)) {
        score += 30;
      }
      
      // Description match gets lower score
      searchWords.forEach(word => {
        if (description.includes(word)) {
          score += 10;
        }
      });
      
      // Tags match gets medium score
      searchWords.forEach(word => {
        if (tags.includes(word)) {
          score += 20;
        }
      });
      
      return { ...video, relevanceScore: score };
    });
    
    // Filter out videos with no matches and sort by relevance
    const filteredVideos = scoredVideos
      .filter(video => video.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (parseInt(page) - 1) * limitNum;
    const paginatedVideos = filteredVideos.slice(offset, offset + limitNum);
    
    res.json({
      videos: paginatedVideos,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: filteredVideos.length,
        hasNext: offset + limitNum < filteredVideos.length
      }
    });
  } catch (error) {
    console.error('CSV search error:', error);
    res.status(500).json({ error: 'Failed to search videos in CSV' });
  }
});

// POST /api/csv/interaction - Record user interaction (simple in-memory storage)
router.post('/interaction', async (req, res) => {
  try {
    const { userId, videoId, interactionType, score } = req.body;
    
    if (!userId || !videoId || !interactionType) {
      return res.status(400).json({ error: 'Missing required fields: userId, videoId, interactionType' });
    }
    
    // Simple in-memory storage (in a real app, this would go to a database)
    // For now, just log the interaction
    console.log('User interaction recorded:', {
      userId,
      videoId,
      interactionType,
      score: score || 5,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Interaction recorded successfully',
      data: {
        userId,
        videoId,
        interactionType,
        score: score || 5,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('CSV interaction error:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

export default router;
