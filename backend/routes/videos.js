import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/videos - Get paginated videos with optional filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      channel,
      sort = 'view_count',
      order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (channel) {
      paramCount++;
      whereClause += ` AND channel_name ILIKE $${paramCount}`;
      params.push(`%${channel}%`);
    }

    // Validate sort column
    const allowedSorts = ['view_count', 'like_count', 'comment_count', 'publish_date', 'daily_rank'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'view_count';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get videos
    const videosQuery = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limitNum, offset);

    const videosResult = await query(videosQuery, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM videos ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset params

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      videos: videosResult.rows,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET /api/videos/trending - Get trending videos
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);

    const queryText = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      WHERE daily_rank IS NOT NULL
      ORDER BY daily_rank ASC, view_count DESC
      LIMIT $1
    `;

    const result = await query(queryText, [limitNum]);

    res.json({
      videos: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching trending videos:', error);
    res.status(500).json({ error: 'Failed to fetch trending videos' });
  }
});

// GET /api/videos/diverse - Get diverse videos from different categories
router.get('/diverse', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);

    // Get videos from different categories
    const categories = [
      'Entertainment',
      'Gaming', 
      'Music',
      'News & Politics',
      'Education',
      'Science & Technology',
      'Sports',
      'Howto & Style',
      'People & Blogs',
      'Comedy',
      'Film & Animation'
    ];

    const videosPerCategory = Math.ceil(limitNum / categories.length);
    const allVideos = [];

    for (const category of categories) {
      const queryText = `
        SELECT 
          id, title, channel_name, channel_id, description, thumbnail_url,
          view_count, like_count, comment_count, video_tags, category,
          publish_date, daily_rank, daily_movement, weekly_movement,
          country, language, created_at
        FROM videos 
        WHERE category = $1
        ORDER BY daily_rank ASC NULLS LAST, view_count DESC
        LIMIT $2
      `;

      const result = await query(queryText, [category, videosPerCategory]);
      allVideos.push(...result.rows);
    }

    // Shuffle the results to mix categories
    const shuffled = allVideos.sort(() => Math.random() - 0.5);
    const selectedVideos = shuffled.slice(0, limitNum);

    res.json({
      videos: selectedVideos,
      count: selectedVideos.length
    });

  } catch (error) {
    console.error('Error fetching diverse videos:', error);
    res.status(500).json({ error: 'Failed to fetch diverse videos' });
  }
});

// GET /api/videos/popular - Get most popular videos
router.get('/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);

    const queryText = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      ORDER BY view_count DESC, like_count DESC
      LIMIT $1
    `;

    const result = await query(queryText, [limitNum]);

    res.json({
      videos: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching popular videos:', error);
    res.status(500).json({ error: 'Failed to fetch popular videos' });
  }
});

// GET /api/videos/:id - Get specific video
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      WHERE id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: result.rows[0] });

  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// GET /api/videos/categories - Get available categories
router.get('/meta/categories', async (req, res) => {
  try {
    const queryText = `
      SELECT category, COUNT(*) as count
      FROM videos 
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;

    const result = await query(queryText);

    res.json({
      categories: result.rows
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/videos/meta/stats - Get video statistics
router.get('/meta/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(DISTINCT channel_name) as total_channels,
        COUNT(DISTINCT category) as total_categories,
        AVG(view_count) as avg_views,
        MAX(view_count) as max_views,
        MIN(view_count) as min_views
      FROM videos
    `;

    const result = await query(statsQuery);

    res.json({
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
