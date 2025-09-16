/**
 * API Service for Backend Communication
 * Handles all API calls to the backend recommendation system
 */

import { getHighQualityThumbnail } from '../utils/thumbnailUtils.js';

const API_BASE_URL = 'http://localhost:3001';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make HTTP request to backend
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle redirects (like collaborative -> content-based)
        if (response.status === 302 || response.status === 301) {
          const redirectUrl = response.headers.get('location');
          if (redirectUrl) {
            console.log(`Redirecting from ${endpoint} to ${redirectUrl}`);
            return this.request(redirectUrl.replace(this.baseUrl, ''), options);
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get server health status
   * @returns {Promise<Object>} Server stats
   */
  async getServerHealth() {
    return this.request('/api/videos/meta/stats');
  }

  /**
   * Search for videos
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchVideos(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      limit: options.limit || 20,
      page: options.page || 1,
      ...options
    });
    
    // Use database search endpoint
    return this.request(`/api/search?${params}`);
  }

  /**
   * Get popular videos
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Popular videos
   */
  async getPopularVideos(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      page: options.page || 1,
      ...options
    });
    
    return this.request(`/api/videos/popular?${params}`);
  }

  /**
   * Get trending videos
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Trending videos
   */
  async getTrendingVideos(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      page: options.page || 1,
      ...options
    });
    
    return this.request(`/api/videos/trending?${params}`);
  }

  /**
   * Get diverse videos from different categories
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Diverse videos
   */
  async getDiverseVideos(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      page: options.page || 1,
      ...options
    });
    
    // Use database endpoint
    return this.request(`/api/videos?${params}`);
  }

  /**
   * Get all videos with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Videos with pagination
   */
  async getAllVideos(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      page: options.page || 1,
      ...options
    });
    
    // Use database endpoint
    return this.request(`/api/videos?${params}`);
  }

  /**
   * Get video by ID
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} Video details
   */
  async getVideoById(videoId) {
    return this.request(`/api/videos/${videoId}`);
  }

  /**
   * Get video categories
   * @returns {Promise<Object>} Available categories
   */
  async getCategories() {
    return this.request('/api/videos/meta/categories');
  }

  /**
   * Get content-based recommendations
   * @param {string} videoId - Reference video ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Content-based recommendations
   */
  async getContentBasedRecommendations(videoId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 20,
        ...options
      });
      
      return this.request(`/api/recommendations/content/${videoId}?${params}`);
    } catch (error) {
      // Database not set up, return empty recommendations
      console.log('Content-based recommendations not available, using fallback');
      return { recommendations: [] };
    }
  }

  /**
   * Get collaborative recommendations
   * @param {string} userId - User ID (session_id)
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Collaborative recommendations
   */
  async getCollaborativeRecommendations(userId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 20,
        ...options
      });
      
      return this.request(`/api/recommendations/collaborative/${userId}?${params}`);
    } catch (error) {
      // Database not set up, return empty recommendations
      console.log('Collaborative recommendations not available, using fallback');
      return { recommendations: [] };
    }
  }

  /**
   * Get hybrid recommendations
   * @param {string} userId - User ID (session_id)
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Hybrid recommendations
   */
  async getHybridRecommendations(userId, options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 20,
        ...options
      });
      
      return this.request(`/api/recommendations/hybrid/${userId}?${params}`);
    } catch (error) {
      // Database not set up, return empty recommendations
      console.log('Hybrid recommendations not available, using fallback');
      return { recommendations: [] };
    }
  }

  /**
   * Record user interaction
   * @param {string} userId - User ID (session_id)
   * @param {string} videoId - Video ID
   * @param {string} interactionType - Type of interaction
   * @param {number} score - Interaction score
   * @returns {Promise<Object>} Interaction result
   */
  async recordInteraction(userId, videoId, interactionType, score = 5) {
    try {
      return this.request('/api/csv/interaction', {
        method: 'POST',
        body: {
          userId,
          videoId,
          interactionType,
          score
        }
      });
    } catch (error) {
      // Fallback: just log locally
      console.log('Interaction recorded locally:', { userId, videoId, interactionType, score });
      return { success: true, message: 'Recorded locally' };
    }
  }

  /**
   * Get user preference summary
   * @param {string} userId - User ID (session_id)
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    return this.request(`/api/recommendations/user/${userId}/preferences`);
  }

  /**
   * Transform backend video format to frontend format
   * @param {Object} backendVideo - Video from backend API
   * @returns {Object} Frontend-formatted video
   */
  transformVideoToFrontendFormat(backendVideo) {
    if (!backendVideo) return null;

    return {
      id: backendVideo.id,
      key: `${backendVideo.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'video',
      creator: backendVideo.channel_name || 'Unknown Channel',
      handle: `@${(backendVideo.channel_name || 'unknown').toLowerCase().replace(/\s+/g, '')}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(backendVideo.channel_name || 'Unknown')}&background=random`,
      src: `https://www.youtube.com/embed/${backendVideo.id}`,
      thumbnail: getHighQualityThumbnail(backendVideo.id, backendVideo.thumbnail_url || ''),
      caption: backendVideo.title || 'Untitled',
      description: backendVideo.description || '',
      publishedAt: backendVideo.publish_date || new Date().toISOString(),
      category: this.mapCategory(backendVideo.category),
      originalCategory: backendVideo.category,
      isFollowed: false,
      views: parseInt(backendVideo.view_count) || 0,
      likes: parseInt(backendVideo.like_count) || 0,
      comments: parseInt(backendVideo.comment_count) || 0,
      shares: Math.floor((parseInt(backendVideo.comment_count) || 0) * 0.1),
      age: this.formatUploadDate(backendVideo.publish_date),
      duration: this.generateRandomDuration(),
      // Backend-specific metrics
      engagementRate: parseFloat(backendVideo.engagement_rate) || 0,
      popularityScore: parseFloat(backendVideo.popularity_score) || 0,
      trendingScore: parseFloat(backendVideo.trending_score) || 0,
      videoTags: backendVideo.tags || [],
      dailyRank: parseInt(backendVideo.daily_rank) || 0,
      dailyMovement: parseInt(backendVideo.daily_movement) || 0,
      weeklyMovement: parseInt(backendVideo.weekly_movement) || 0,
      // Recommendation-specific data
      similarityScore: backendVideo.similarity_score || 0,
      recommendationScore: backendVideo.recommendation_score || 0
    };
  }

  /**
   * Map backend category to frontend category
   * @param {string} backendCategory - Backend category
   * @returns {string} Frontend category
   */
  mapCategory(backendCategory) {
    const categoryMap = {
      'Entertainment': 'entertainment',
      'Gaming': 'gaming',
      'Music': 'music',
      'News & Politics': 'news',
      'Education': 'education',
      'Science & Technology': 'tech',
      'Sports': 'sports',
      'Travel & Events': 'travel',
      'Howto & Style': 'lifestyle',
      'People & Blogs': 'people'
    };
    
    return categoryMap[backendCategory] || 'entertainment';
  }

  /**
   * Format upload date for display
   * @param {string} publishDate - Publish date string
   * @returns {string} Formatted upload date
   */
  formatUploadDate(publishDate) {
    if (!publishDate) return 'Unknown';
    
    const date = new Date(publishDate);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }

  /**
   * Generate random duration for videos
   * @returns {string} Random duration
   */
  generateRandomDuration() {
    const minutes = Math.floor(Math.random() * 20) + 1;
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Transform array of backend videos to frontend format
   * @param {Array} backendVideos - Array of videos from backend
   * @returns {Array} Array of frontend-formatted videos
   */
  transformVideosToFrontendFormat(backendVideos) {
    if (!Array.isArray(backendVideos)) return [];
    
    return backendVideos
      .map(video => this.transformVideoToFrontendFormat(video))
      .filter(video => video !== null);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
