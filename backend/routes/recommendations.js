import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Content-based recommendation using tag similarity
const calculateTagSimilarity = (tags1, tags2) => {
  if (!tags1 || !tags2 || tags1.length === 0 || tags2.length === 0) {
    return 0;
  }

  const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
  const set2 = new Set(tags2.map(tag => tag.toLowerCase()));
  
  const intersection = new Set([...set1].filter(tag => set2.has(tag)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
};

// GET /api/recommendations/content/:videoId - Content-based recommendations
router.get('/content/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit), 50);

    // Get the source video
    const sourceVideoQuery = `
      SELECT id, title, video_tags, category, channel_name
      FROM videos 
      WHERE id = $1
    `;
    
    const sourceResult = await query(sourceVideoQuery, [videoId]);
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const sourceVideo = sourceResult.rows[0];

    // Get all other videos for comparison
    const allVideosQuery = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      WHERE id != $1
    `;

    const allVideosResult = await query(allVideosQuery, [videoId]);

    // Calculate similarity scores
    const videosWithScores = allVideosResult.rows.map(video => {
      const tagSimilarity = calculateTagSimilarity(sourceVideo.video_tags, video.video_tags);
      
      // Bonus for same category
      const categoryBonus = video.category === sourceVideo.category ? 0.1 : 0;
      
      // Bonus for same channel
      const channelBonus = video.channel_name === sourceVideo.channel_name ? 0.05 : 0;
      
      const totalScore = tagSimilarity + categoryBonus + channelBonus;
      
      return {
        ...video,
        similarity_score: totalScore
      };
    });

    // Sort by similarity score and get top recommendations
    const recommendations = videosWithScores
      .filter(video => video.similarity_score > 0)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limitNum);

    res.json({
      source_video: sourceVideo,
      recommendations: recommendations,
      count: recommendations.length
    });

  } catch (error) {
    console.error('Error getting content recommendations:', error);
    res.status(500).json({ error: 'Failed to get content recommendations' });
  }
});

// GET /api/recommendations/collaborative/:userId - Collaborative filtering
router.get('/collaborative/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit), 50);

    // First, try to get the actual user ID (in case userId is a session_id)
    let actualUserId = userId;
    
    // Check if userId looks like a UUID, if not, treat it as session_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      const userLookupQuery = 'SELECT id FROM users WHERE session_id = $1';
      const userLookupResult = await query(userLookupQuery, [userId]);
      if (userLookupResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = userLookupResult.rows[0].id;
    }

    // Get user's liked videos
    const userLikesQuery = `
      SELECT v.id, v.video_tags, v.category, v.channel_name
      FROM user_interactions ui
      JOIN videos v ON ui.video_id = v.id
      WHERE ui.user_id = $1 AND ui.interaction_type = 'like'
    `;

    const userLikesResult = await query(userLikesQuery, [actualUserId]);

    if (userLikesResult.rows.length === 0) {
      // If user has no likes, return popular videos
      const popularQuery = `
        SELECT 
          id, title, channel_name, channel_id, description, thumbnail_url,
          view_count, like_count, comment_count, video_tags, category,
          publish_date, daily_rank, daily_movement, weekly_movement,
          country, language, created_at
        FROM videos 
        ORDER BY view_count DESC, like_count DESC
        LIMIT $1
      `;

      const popularResult = await query(popularQuery, [limitNum]);
      
      return res.json({
        recommendations: popularResult.rows,
        count: popularResult.rows.length,
        type: 'popular_fallback'
      });
    }

    // Get all user's liked video IDs
    const likedVideoIds = userLikesResult.rows.map(video => video.id);

    // Find users who liked similar videos
    const similarUsersQuery = `
      SELECT DISTINCT ui2.user_id, COUNT(*) as common_likes
      FROM user_interactions ui1
      JOIN user_interactions ui2 ON ui1.video_id = ui2.video_id
      WHERE ui1.user_id = $1 
        AND ui2.user_id != $1 
        AND ui1.interaction_type = 'like' 
        AND ui2.interaction_type = 'like'
      GROUP BY ui2.user_id
      HAVING COUNT(*) >= 2
      ORDER BY common_likes DESC
      LIMIT 10
    `;

    const similarUsersResult = await query(similarUsersQuery, [actualUserId]);

    if (similarUsersResult.rows.length === 0) {
      // Fallback to content-based recommendations
      const firstLikedVideo = userLikesResult.rows[0];
      
      // Get content-based recommendations directly instead of redirecting
      const contentQuery = `
        SELECT 
          v2.id, v2.title, v2.channel_name, v2.channel_id, v2.description, v2.thumbnail_url,
          v2.view_count, v2.like_count, v2.comment_count, v2.video_tags, v2.category,
          v2.publish_date, v2.daily_rank, v2.daily_movement, v2.weekly_movement,
          v2.country, v2.language, v2.created_at,
          CASE 
            WHEN v2.channel_name = v1.channel_name THEN 0.4
            ELSE 0.0
          END + 
          CASE 
            WHEN v2.category = v1.category THEN 0.3
            ELSE 0.0
          END +
          CASE 
            WHEN v2.video_tags && v1.video_tags THEN 
              array_length(array(SELECT unnest(v2.video_tags) INTERSECT SELECT unnest(v1.video_tags)), 1)::float / 
              array_length(array(SELECT unnest(v2.video_tags) UNION SELECT unnest(v1.video_tags)), 1)::float * 0.3
            ELSE 0.0
          END as similarity_score
        FROM videos v1
        CROSS JOIN videos v2
        WHERE v1.id = $1 
          AND v2.id != $1
        ORDER BY similarity_score DESC, v2.view_count DESC
        LIMIT $2
      `;
      
      const contentResult = await query(contentQuery, [firstLikedVideo.id, limitNum]);
      
      return res.json({
        recommendations: contentResult.rows,
        count: contentResult.rows.length,
        type: 'content_fallback',
        source_video: firstLikedVideo
      });
    }

    // Get videos liked by similar users that current user hasn't liked
    const similarUserIds = similarUsersResult.rows.map(user => user.user_id);
    const placeholders = similarUserIds.map((_, index) => `$${index + 2}`).join(',');

    const recommendationsQuery = `
      SELECT 
        v.id, v.title, v.channel_name, v.channel_id, v.description, v.thumbnail_url,
        v.view_count, v.like_count, v.comment_count, v.video_tags, v.category,
        v.publish_date, v.daily_rank, v.daily_movement, v.weekly_movement,
        v.country, v.language, v.created_at,
        COUNT(*) as recommendation_score
      FROM user_interactions ui
      JOIN videos v ON ui.video_id = v.id
      WHERE ui.user_id IN (${placeholders})
        AND ui.interaction_type = 'like'
        AND v.id NOT IN (${likedVideoIds.map((_, index) => `$${similarUserIds.length + index + 2}`).join(',')})
      GROUP BY v.id, v.title, v.channel_name, v.channel_id, v.description, v.thumbnail_url,
               v.view_count, v.like_count, v.comment_count, v.video_tags, v.category,
               v.publish_date, v.daily_rank, v.daily_movement, v.weekly_movement,
               v.country, v.language, v.created_at
      ORDER BY recommendation_score DESC, v.view_count DESC
      LIMIT $${similarUserIds.length + likedVideoIds.length + 2}
    `;

    const params = [actualUserId, ...similarUserIds, ...likedVideoIds, limitNum];
    const recommendationsResult = await query(recommendationsQuery, params);

    res.json({
      recommendations: recommendationsResult.rows,
      count: recommendationsResult.rows.length,
      type: 'collaborative',
      similar_users_count: similarUsersResult.rows.length
    });

  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    res.status(500).json({ error: 'Failed to get collaborative recommendations' });
  }
});

// GET /api/recommendations/hybrid/:userId - Hybrid recommendations
router.get('/hybrid/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit), 50);

    // First, try to get the actual user ID (in case userId is a session_id)
    let actualUserId = userId;
    
    // Check if userId looks like a UUID, if not, treat it as session_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      const userLookupQuery = 'SELECT id FROM users WHERE session_id = $1';
      const userLookupResult = await query(userLookupQuery, [userId]);
      if (userLookupResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = userLookupResult.rows[0].id;
    }

    // Get user's recent interactions
    const userInteractionsQuery = `
      SELECT v.id, v.video_tags, v.category, v.channel_name, ui.interaction_type, ui.score
      FROM user_interactions ui
      JOIN videos v ON ui.video_id = v.id
      WHERE ui.user_id = $1
      ORDER BY ui.created_at DESC
      LIMIT 20
    `;

    const userInteractionsResult = await query(userInteractionsQuery, [actualUserId]);

    if (userInteractionsResult.rows.length === 0) {
      // Return popular videos for new users
      const popularQuery = `
        SELECT 
          id, title, channel_name, channel_id, description, thumbnail_url,
          view_count, like_count, comment_count, video_tags, category,
          publish_date, daily_rank, daily_movement, weekly_movement,
          country, language, created_at
        FROM videos 
        ORDER BY view_count DESC, like_count DESC
        LIMIT $1
      `;

      const popularResult = await query(popularQuery, [limitNum]);
      
      return res.json({
        recommendations: popularResult.rows,
        count: popularResult.rows.length,
        type: 'popular_fallback'
      });
    }

    // Calculate user preferences
    const userTags = {};
    const userCategories = {};
    const userChannels = {};

    userInteractionsResult.rows.forEach(interaction => {
      const weight = interaction.interaction_type === 'like' ? 2 : 
                    interaction.interaction_type === 'dislike' ? -1 : 1;

      // Aggregate tags
      if (interaction.video_tags) {
        interaction.video_tags.forEach(tag => {
          userTags[tag] = (userTags[tag] || 0) + weight;
        });
      }

      // Aggregate categories
      if (interaction.category) {
        userCategories[interaction.category] = (userCategories[interaction.category] || 0) + weight;
      }

      // Aggregate channels
      if (interaction.channel_name) {
        userChannels[interaction.channel_name] = (userChannels[interaction.channel_name] || 0) + weight;
      }
    });

    // Get all videos for scoring
    const allVideosQuery = `
      SELECT 
        id, title, channel_name, channel_id, description, thumbnail_url,
        view_count, like_count, comment_count, video_tags, category,
        publish_date, daily_rank, daily_movement, weekly_movement,
        country, language, created_at
      FROM videos 
      WHERE id NOT IN (${userInteractionsResult.rows.map((_, index) => `$${index + 1}`).join(',')})
    `;

    const videoIds = userInteractionsResult.rows.map(interaction => interaction.id);
    const allVideosResult = await query(allVideosQuery, videoIds);

    // Score videos based on user preferences
    const scoredVideos = allVideosResult.rows.map(video => {
      let score = 0;

      // Tag-based scoring
      if (video.video_tags) {
        video.video_tags.forEach(tag => {
          score += userTags[tag] || 0;
        });
      }

      // Category-based scoring
      if (video.category) {
        score += (userCategories[video.category] || 0) * 2;
      }

      // Channel-based scoring
      if (video.channel_name) {
        score += (userChannels[video.channel_name] || 0) * 1.5;
      }

      // Popularity boost
      score += Math.log(video.view_count + 1) * 0.1;

      return {
        ...video,
        recommendation_score: score
      };
    });

    // Sort and return top recommendations
    const recommendations = scoredVideos
      .filter(video => video.recommendation_score > 0)
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limitNum);

    res.json({
      recommendations: recommendations,
      count: recommendations.length,
      type: 'hybrid',
      user_preferences: {
        top_tags: Object.entries(userTags).sort((a, b) => b[1] - a[1]).slice(0, 5),
        top_categories: Object.entries(userCategories).sort((a, b) => b[1] - a[1]).slice(0, 3),
        top_channels: Object.entries(userChannels).sort((a, b) => b[1] - a[1]).slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Error getting hybrid recommendations:', error);
    res.status(500).json({ error: 'Failed to get hybrid recommendations' });
  }
});

// POST /api/recommendations/interaction - Record user interaction
router.post('/interaction', async (req, res) => {
  try {
    const { userId, videoId, interactionType, score = 1 } = req.body;

    if (!userId || !videoId || !interactionType) {
      return res.status(400).json({ 
        error: 'userId, videoId, and interactionType are required' 
      });
    }

    const validTypes = ['view', 'like', 'dislike', 'share'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({ 
        error: 'interactionType must be one of: view, like, dislike, share' 
      });
    }

    // Ensure user exists and get the actual user ID
    const userQuery = `
      INSERT INTO users (id, session_id) 
      VALUES (gen_random_uuid(), $1) 
      ON CONFLICT (session_id) DO NOTHING
      RETURNING id
    `;
    const userResult = await query(userQuery, [userId]);
    
    let actualUserId = userResult.rows[0]?.id;
    
    // If user already exists, get their ID
    if (!actualUserId) {
      const existingUserQuery = 'SELECT id FROM users WHERE session_id = $1';
      const existingUserResult = await query(existingUserQuery, [userId]);
      actualUserId = existingUserResult.rows[0]?.id;
    }
    
    if (!actualUserId) {
      return res.status(500).json({ error: 'Failed to create or find user' });
    }

    // Record interaction
    const interactionQuery = `
      INSERT INTO user_interactions (user_id, video_id, interaction_type, score)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, video_id, interaction_type) 
      DO UPDATE SET score = EXCLUDED.score, created_at = CURRENT_TIMESTAMP
    `;

    await query(interactionQuery, [actualUserId, videoId, interactionType, score]);

    res.json({ 
      success: true, 
      message: 'Interaction recorded successfully' 
    });

  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

export default router;
