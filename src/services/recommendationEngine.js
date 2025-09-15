/**
 * Recommendation Engine Service
 * Implements collaborative filtering and content-based recommendation algorithms
 */

export class RecommendationEngine {
  constructor(csvParserService) {
    this.csvParser = csvParserService;
    this.userPreferences = new Map(); // Store user preferences
    this.videoSimilarityMatrix = new Map(); // Cache for video similarity
    this.channelSimilarityMatrix = new Map(); // Cache for channel similarity
  }

  /**
   * Add user preference based on interaction
   * @param {string} userId - User identifier
   * @param {string} videoId - Video identifier
   * @param {string} action - Action type (like, view, share, etc.)
   * @param {number} score - Preference score (1-10)
   */
  addUserPreference(userId, videoId, action, score = 5) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        likedVideos: new Set(),
        viewedVideos: new Set(),
        sharedVideos: new Set(),
        dislikedVideos: new Set(),
        preferences: new Map()
      });
    }

    const userPrefs = this.userPreferences.get(userId);
    
    switch (action) {
      case 'like':
        userPrefs.likedVideos.add(videoId);
        userPrefs.preferences.set(videoId, Math.max(score, userPrefs.preferences.get(videoId) || 0));
        break;
      case 'view':
        userPrefs.viewedVideos.add(videoId);
        userPrefs.preferences.set(videoId, Math.max(score * 0.5, userPrefs.preferences.get(videoId) || 0));
        break;
      case 'share':
        userPrefs.sharedVideos.add(videoId);
        userPrefs.preferences.set(videoId, Math.max(score * 1.5, userPrefs.preferences.get(videoId) || 0));
        break;
      case 'dislike':
        userPrefs.dislikedVideos.add(videoId);
        userPrefs.preferences.set(videoId, Math.min(score * -1, userPrefs.preferences.get(videoId) || 0));
        break;
    }
  }

  /**
   * Get recommendations for a user using collaborative filtering
   * @param {string} userId - User identifier
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Array of recommended videos
   */
  async getCollaborativeRecommendations(userId, limit = 20) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs || userPrefs.likedVideos.size === 0) {
      return this.getPopularRecommendations(limit);
    }

    const allVideos = await this.csvParser.getAllVideos();
    const userLikedVideos = Array.from(userPrefs.likedVideos);
    
    // Find similar users based on video preferences
    const similarUsers = this.findSimilarUsers(userId);
    
    // Get videos liked by similar users but not by current user
    const candidateVideos = new Map();
    
    for (const [similarUserId, similarity] of similarUsers) {
      const similarUserPrefs = this.userPreferences.get(similarUserId);
      if (similarUserPrefs) {
        for (const videoId of similarUserPrefs.likedVideos) {
          if (!userPrefs.likedVideos.has(videoId) && !userPrefs.dislikedVideos.has(videoId)) {
            const currentScore = candidateVideos.get(videoId) || 0;
            candidateVideos.set(videoId, currentScore + similarity);
          }
        }
      }
    }

    // Sort by score and get top recommendations
    const sortedCandidates = Array.from(candidateVideos.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([videoId, score]) => {
        const video = allVideos.find(v => v.id === videoId);
        return video ? { ...video, recommendationScore: score } : null;
      })
      .filter(video => video !== null);

    return sortedCandidates;
  }

  /**
   * Get content-based recommendations
   * @param {string} videoId - Reference video ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Array of recommended videos
   */
  async getContentBasedRecommendations(videoId, limit = 20) {
    const allVideos = await this.csvParser.getAllVideos();
    const referenceVideo = allVideos.find(v => v.id === videoId);
    
    if (!referenceVideo) {
      return this.getPopularRecommendations(limit);
    }

    // Calculate similarity with all other videos
    const similarities = [];
    
    for (const video of allVideos) {
      if (video.id !== videoId) {
        const similarity = this.calculateVideoSimilarity(referenceVideo, video);
        similarities.push({ video, similarity });
      }
    }

    // Sort by similarity and return top recommendations
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => ({ ...item.video, recommendationScore: item.similarity }));
  }

  /**
   * Get hybrid recommendations combining collaborative and content-based filtering
   * @param {string} userId - User identifier
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Array of recommended videos
   */
  async getHybridRecommendations(userId, limit = 20) {
    const [collaborativeRecs, contentBasedRecs] = await Promise.all([
      this.getCollaborativeRecommendations(userId, limit * 2),
      this.getContentBasedRecommendations(userId, limit * 2)
    ]);

    // Combine and deduplicate recommendations
    const combinedRecs = new Map();
    
    // Add collaborative recommendations with weight 0.6
    collaborativeRecs.forEach(video => {
      combinedRecs.set(video.id, {
        ...video,
        recommendationScore: (video.recommendationScore || 0) * 0.6
      });
    });

    // Add content-based recommendations with weight 0.4
    contentBasedRecs.forEach(video => {
      const existing = combinedRecs.get(video.id);
      if (existing) {
        existing.recommendationScore += (video.recommendationScore || 0) * 0.4;
      } else {
        combinedRecs.set(video.id, {
          ...video,
          recommendationScore: (video.recommendationScore || 0) * 0.4
        });
      }
    });

    // Sort by combined score and return top recommendations
    return Array.from(combinedRecs.values())
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Get popular recommendations based on trending and engagement
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Array of popular videos
   */
  async getPopularRecommendations(limit = 20) {
    const allVideos = await this.csvParser.getAllVideos();
    
    // Combine trending score and popularity score
    return allVideos
      .map(video => ({
        ...video,
        recommendationScore: video.trendingScore * 0.4 + video.popularityScore * 0.6
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Get recommendations based on user's recent activity
   * @param {string} userId - User identifier
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Array of recommended videos
   */
  async getRecentActivityRecommendations(userId, limit = 20) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs || userPrefs.viewedVideos.size === 0) {
      return this.getPopularRecommendations(limit);
    }

    const allVideos = await this.csvParser.getAllVideos();
    const viewedVideos = Array.from(userPrefs.viewedVideos);
    
    // Get videos from same channels as viewed videos
    const viewedChannels = new Set();
    viewedVideos.forEach(videoId => {
      const video = allVideos.find(v => v.id === videoId);
      if (video) {
        viewedChannels.add(video.channelName);
      }
    });

    // Find videos from these channels that user hasn't seen
    const candidateVideos = allVideos.filter(video => 
      viewedChannels.has(video.channelName) && 
      !userPrefs.viewedVideos.has(video.id) &&
      !userPrefs.dislikedVideos.has(video.id)
    );

    return candidateVideos
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit)
      .map(video => ({ ...video, recommendationScore: video.popularityScore }));
  }

  /**
   * Find similar users based on video preferences
   * @param {string} userId - User identifier
   * @returns {Array} Array of [userId, similarity] pairs
   */
  findSimilarUsers(userId) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return [];

    const similarities = [];
    
    for (const [otherUserId, otherPrefs] of this.userPreferences) {
      if (otherUserId === userId) continue;
      
      const similarity = this.calculateUserSimilarity(userPrefs, otherPrefs);
      if (similarity > 0) {
        similarities.push([otherUserId, similarity]);
      }
    }

    return similarities.sort((a, b) => b[1] - a[1]);
  }

  /**
   * Calculate similarity between two users
   * @param {Object} userPrefs1 - First user preferences
   * @param {Object} userPrefs2 - Second user preferences
   * @returns {number} Similarity score (0-1)
   */
  calculateUserSimilarity(userPrefs1, userPrefs2) {
    const liked1 = userPrefs1.likedVideos;
    const liked2 = userPrefs2.likedVideos;
    
    const intersection = new Set([...liked1].filter(x => liked2.has(x)));
    const union = new Set([...liked1, ...liked2]);
    
    if (union.size === 0) return 0;
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two videos
   * @param {Object} video1 - First video
   * @param {Object} video2 - Second video
   * @returns {number} Similarity score (0-1)
   */
  calculateVideoSimilarity(video1, video2) {
    let similarity = 0;
    let factors = 0;

    // Channel similarity (40% weight)
    if (video1.channelName === video2.channelName) {
      similarity += 0.4;
    }
    factors += 0.4;

    // Tag similarity (30% weight)
    const tags1 = new Set(video1.videoTags || []);
    const tags2 = new Set(video2.videoTags || []);
    const tagIntersection = new Set([...tags1].filter(x => tags2.has(x)));
    const tagUnion = new Set([...tags1, ...tags2]);
    
    if (tagUnion.size > 0) {
      similarity += (tagIntersection.size / tagUnion.size) * 0.3;
    }
    factors += 0.3;

    // Title similarity (20% weight)
    const titleSimilarity = this.calculateTextSimilarity(video1.title, video2.title);
    similarity += titleSimilarity * 0.2;
    factors += 0.2;

    // Engagement similarity (10% weight)
    const engagementDiff = Math.abs(video1.engagementRate - video2.engagementRate);
    const engagementSimilarity = Math.max(0, 1 - engagementDiff);
    similarity += engagementSimilarity * 0.1;
    factors += 0.1;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate text similarity using simple word overlap
   * @param {string} text1 - First text
   * @string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get user preference summary
   * @param {string} userId - User identifier
   * @returns {Object} User preference summary
   */
  getUserPreferenceSummary(userId) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) {
      return {
        totalInteractions: 0,
        likedVideos: 0,
        viewedVideos: 0,
        sharedVideos: 0,
        dislikedVideos: 0,
        topChannels: [],
        topTags: []
      };
    }

    return {
      totalInteractions: userPrefs.likedVideos.size + userPrefs.viewedVideos.size + 
                        userPrefs.sharedVideos.size + userPrefs.dislikedVideos.size,
      likedVideos: userPrefs.likedVideos.size,
      viewedVideos: userPrefs.viewedVideos.size,
      sharedVideos: userPrefs.sharedVideos.size,
      dislikedVideos: userPrefs.dislikedVideos.size,
      topChannels: this.getTopChannelsForUser(userId),
      topTags: this.getTopTagsForUser(userId)
    };
  }

  /**
   * Get top channels for a user
   * @param {string} userId - User identifier
   * @returns {Array} Array of [channelName, count] pairs
   */
  async getTopChannelsForUser(userId) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return [];

    const allVideos = await this.csvParser.getAllVideos();
    const channelCounts = new Map();

    for (const videoId of userPrefs.likedVideos) {
      const video = allVideos.find(v => v.id === videoId);
      if (video) {
        const count = channelCounts.get(video.channelName) || 0;
        channelCounts.set(video.channelName, count + 1);
      }
    }

    return Array.from(channelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  /**
   * Get top tags for a user
   * @param {string} userId - User identifier
   * @returns {Array} Array of [tag, count] pairs
   */
  async getTopTagsForUser(userId) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return [];

    const allVideos = await this.csvParser.getAllVideos();
    const tagCounts = new Map();

    for (const videoId of userPrefs.likedVideos) {
      const video = allVideos.find(v => v.id === videoId);
      if (video && video.videoTags) {
        video.videoTags.forEach(tag => {
          const count = tagCounts.get(tag) || 0;
          tagCounts.set(tag, count + 1);
        });
      }
    }

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }
}

// Export singleton instance (will be initialized with csvParserService)
export let recommendationEngine = null;

export function initializeRecommendationEngine(csvParserService) {
  recommendationEngine = new RecommendationEngine(csvParserService);
  return recommendationEngine;
}

