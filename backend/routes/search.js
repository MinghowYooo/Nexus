import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/search - Search videos with full-text search
router.get('/', async (req, res) => {
  try {
    const {
      q: searchQuery,
      page = 1,
      limit = 20,
      category,
      sort = 'relevance'
    } = req.query;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);

    // Build search query with full-text search
    let whereClause = `
      WHERE (
        title ILIKE $1 OR 
        description ILIKE $1 OR 
        channel_name ILIKE $1 OR
        $2 = ANY(video_tags)
      )
    `;
    
    const params = [`%${searchQuery}%`, searchQuery];
    let paramCount = 2;

    // Add category filter if provided
    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    // Build ORDER BY clause based on sort parameter
    let orderClause;
    switch (sort) {
      case 'views':
        orderClause = 'ORDER BY view_count DESC';
        break;
      case 'likes':
        orderClause = 'ORDER BY like_count DESC';
        break;
      case 'date':
        orderClause = 'ORDER BY publish_date DESC';
        break;
      case 'relevance':
      default:
        // Relevance scoring based on title matches, then description, then channel
        orderClause = `
          ORDER BY 
            CASE WHEN title ILIKE $1 THEN 3 ELSE 0 END +
            CASE WHEN description ILIKE $1 THEN 2 ELSE 0 END +
            CASE WHEN channel_name ILIKE $1 THEN 1 ELSE 0 END DESC,
            view_count DESC
        `;
        break;
    }

    // Get search results
    const searchQueryText = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limitNum, offset);

    const searchResult = await query(searchQueryText, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM videos ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, -2));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      videos: searchResult.rows,
      query: searchQuery,
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
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Failed to search videos' });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q: searchQuery, limit = 10 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const limitNum = Math.min(parseInt(limit), 20);

    // Get suggestions from titles, channels, and tags
    const suggestionsQuery = `
      (
        SELECT DISTINCT title as suggestion, 'title' as type
        FROM videos 
        WHERE title ILIKE $1
        LIMIT $2
      )
      UNION
      (
        SELECT DISTINCT channel_name as suggestion, 'channel' as type
        FROM videos 
        WHERE channel_name ILIKE $1
        LIMIT $2
      )
      UNION
      (
        SELECT DISTINCT unnest(video_tags) as suggestion, 'tag' as type
        FROM videos 
        WHERE $3 = ANY(video_tags)
        LIMIT $2
      )
      LIMIT $2
    `;

    const result = await query(suggestionsQuery, [
      `%${searchQuery}%`,
      limitNum,
      searchQuery
    ]);

    res.json({
      suggestions: result.rows
    });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// GET /api/search/trending - Get trending search terms (mock implementation)
router.get('/trending', async (req, res) => {
  try {
    // This would typically come from analytics data
    // For now, we'll return popular tags
    const trendingQuery = `
      SELECT unnest(video_tags) as term, COUNT(*) as count
      FROM videos 
      WHERE video_tags IS NOT NULL AND array_length(video_tags, 1) > 0
      GROUP BY unnest(video_tags)
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await query(trendingQuery);

    res.json({
      trending: result.rows
    });

  } catch (error) {
    console.error('Error getting trending searches:', error);
    res.status(500).json({ error: 'Failed to get trending searches' });
  }
});

export default router;
