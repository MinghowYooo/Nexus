import { csvParserService } from './csvParser.js';
import { initializeRecommendationEngine } from './recommendationEngine.js';
import { apiService } from './apiService.js';
import { getHighQualityThumbnail } from '../utils/thumbnailUtils.js';

/**
 * Video Database Service
 * Handles all video data operations using the CSV database and recommendation engine
 */
export class VideoDatabaseService {
  constructor() {
    // Initialize with empty database - will be loaded asynchronously
    this.database = {};
    this.isLoaded = false;
    this.csvData = [];
    this.recommendationEngine = null;
    this.loadPromise = null; // Lazy-init; only load CSV when needed
    this.debug = false; // Toggle verbose logs
  }

  /**
   * Load the video database asynchronously from CSV
   */
  async loadDatabase() {
    try {
      // Load CSV data
      this.csvData = await csvParserService.getAllVideos();
      
      // Initialize recommendation engine
      this.recommendationEngine = initializeRecommendationEngine(csvParserService);
      
      // Create category-based database for backward compatibility
      this.database = this.createCategoryDatabase();
      
      this.isLoaded = true;
      if (this.debug) console.log(`Video database loaded successfully: ${this.csvData.length} videos`);
    } catch (error) {
      console.error('Failed to load video database:', error);
      this.database = {};
      this.csvData = [];
      this.isLoaded = true; // Mark as loaded even if failed to prevent infinite retries
    }
  }

  /**
   * Ensure database is loaded before operations
   */
  async ensureLoaded() {
    if (this.isLoaded) return;
    if (!this.loadPromise) {
      this.loadPromise = this.loadDatabase();
    }
    await this.loadPromise;
  }

  /**
   * Create category-based database from CSV data for backward compatibility
   * @returns {Object} Category-based database
   */
  createCategoryDatabase() {
    const categories = {
      'Entertainment & Comedy': [],
      'Gaming': [],
      'Music': [],
      'News & Politics': [],
      'Education': [],
      'Science & Technology': [],
      'Sports': [],
      'Travel & Events': [],
      'Howto & Style': [],
      'People & Blogs': []
    };

    this.csvData.forEach(video => {
      const category = this.categorizeVideo(video);
      if (categories[category]) {
        categories[category].push(this.transformCSVVideoToLegacyFormat(video));
      }
    });

    return categories;
  }

  /**
   * Categorize video based on tags and content
   * @param {Object} video - Video object from CSV
   * @returns {string} Category name
   */
  categorizeVideo(video) {
    if (!video) return 'Entertainment & Comedy';
    
    const tags = (video.videoTags || []).join(' ').toLowerCase();
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const channelName = (video.channelName || '').toLowerCase();

    // Music
    if (tags.includes('music') || tags.includes('song') || tags.includes('album') ||
        title.includes('music video') || title.includes('official video') ||
        channelName.includes('vevo') || channelName.includes('music')) {
      return 'Music';
    }

    // Gaming
    if (tags.includes('gaming') || tags.includes('game') || tags.includes('playthrough') ||
        title.includes('gameplay') || title.includes('gaming') ||
        channelName.includes('gaming') || channelName.includes('games')) {
      return 'Gaming';
    }

    // News & Politics
    if (tags.includes('news') || tags.includes('politics') || tags.includes('breaking') ||
        title.includes('news') || title.includes('breaking') ||
        channelName.includes('news') || channelName.includes('cnn') || channelName.includes('fox')) {
      return 'News & Politics';
    }

    // Education
    if (tags.includes('education') || tags.includes('tutorial') || tags.includes('learn') ||
        title.includes('how to') || title.includes('tutorial') || title.includes('learn') ||
        channelName.includes('education') || channelName.includes('tutorial')) {
      return 'Education';
    }

    // Science & Technology
    if (tags.includes('science') || tags.includes('tech') || tags.includes('technology') ||
        title.includes('science') || title.includes('tech') || title.includes('ai') ||
        channelName.includes('science') || channelName.includes('tech')) {
      return 'Science & Technology';
    }

    // Sports
    if (tags.includes('sports') || tags.includes('football') || tags.includes('basketball') ||
        title.includes('sports') || title.includes('nfl') || title.includes('nba') ||
        channelName.includes('sports') || channelName.includes('espn')) {
      return 'Sports';
    }

    // Travel & Events
    if (tags.includes('travel') || tags.includes('vlog') || tags.includes('lifestyle') ||
        title.includes('travel') || title.includes('vlog') ||
        channelName.includes('travel') || channelName.includes('vlog')) {
      return 'Travel & Events';
    }

    // Howto & Style
    if (tags.includes('howto') || tags.includes('style') || tags.includes('beauty') ||
        title.includes('how to') || title.includes('tutorial') ||
        channelName.includes('howto') || channelName.includes('beauty')) {
      return 'Howto & Style';
    }

    // People & Blogs
    if (tags.includes('vlog') || tags.includes('blog') || tags.includes('personal') ||
        title.includes('vlog') || title.includes('my') ||
        channelName.includes('vlog') || channelName.includes('blog')) {
      return 'People & Blogs';
    }

    // Default to Entertainment & Comedy
    return 'Entertainment & Comedy';
  }

  /**
   * Transform CSV video to legacy format for backward compatibility
   * @param {Object} csvVideo - Video from CSV
   * @returns {Object} Video in legacy format
   */
  transformCSVVideoToLegacyFormat(csvVideo) {
    return {
      id: csvVideo.id,
      title: csvVideo.title,
      description: csvVideo.description,
      thumbnailUrl: csvVideo.thumbnailUrl,
      channelName: csvVideo.channelName,
      channelAvatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(csvVideo.channelName)}&background=random`,
      views: this.formatViews(csvVideo.viewCount),
      uploadedAt: this.formatUploadDate(csvVideo.publishDate),
      duration: this.generateRandomDuration(),
      // Add CSV-specific data
      viewCount: csvVideo.viewCount,
      likeCount: csvVideo.likeCount,
      commentCount: csvVideo.commentCount,
      engagementRate: csvVideo.engagementRate,
      popularityScore: csvVideo.popularityScore,
      trendingScore: csvVideo.trendingScore,
      videoTags: csvVideo.videoTags,
      dailyRank: csvVideo.dailyRank,
      dailyMovement: csvVideo.dailyMovement,
      weeklyMovement: csvVideo.weeklyMovement
    };
  }

  /**
   * Format view count for display
   * @param {number} viewCount - Raw view count
   * @returns {string} Formatted view count
   */
  formatViews(viewCount) {
    if (viewCount >= 1000000000) {
      return `${(viewCount / 1000000000).toFixed(1)}B views`;
    } else if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M views`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K views`;
    } else {
      return `${viewCount} views`;
    }
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
   * Search for videos in the database
   * @param {string} query - Search query
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Array of video objects
   */
  async searchVideos(query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        return this.getMostPopularVideos(20);
      }

      // Use backend API for search
      const response = await apiService.searchVideos(query, { limit: options.limit || 20 });
      return apiService.transformVideosToFrontendFormat(response.videos || []);
    } catch (error) {
      console.error('Search failed, falling back to CSV:', error);
      // Fallback to CSV search
      await this.ensureLoaded();
      const csvResults = await csvParserService.searchVideos(query);
      return csvResults
        .map(video => this.transformCSVVideoToAppFormat(video))
        .filter(video => video !== null);
    }
  }

  /**
   * Get all videos from a specific category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of video objects
   */
  async getVideosByCategory(category) {
    await this.ensureLoaded();
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this.database[category] || [];
        resolve(this.transformVideos(results, category));
      }, 50);
    });
  }

  /**
   * Get all videos from all categories
   * @returns {Promise<Array>} Array of all video objects
   */
  async getAllVideos() {
    await this.ensureLoaded();
    return new Promise((resolve) => {
      setTimeout(() => {
        const allVideos = [];
        Object.entries(this.database).forEach(([categoryName, categoryVideos]) => {
          allVideos.push(...this.transformVideos(categoryVideos, categoryName));
        });
        resolve(allVideos);
      }, 50);
    });
  }

  /**
   * Transform CSV video to app format
   * @param {Object} csvVideo - Video from CSV
   * @returns {Object} Video in app format
   */
  transformCSVVideoToAppFormat(csvVideo) {
    // Validate required fields
    if (!csvVideo || !csvVideo.id || !csvVideo.title || !csvVideo.channelName) {
      console.warn('Invalid video object:', csvVideo);
      return null;
    }

    // Generate unique key to prevent React conflicts
    const uniqueKey = `${csvVideo.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: csvVideo.id,
      key: uniqueKey,
      type: 'video',
      creator: csvVideo.channelName || 'Unknown Channel',
      handle: `@${(csvVideo.channelName || 'unknown').toLowerCase().replace(/\s+/g, '')}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(csvVideo.channelName || 'Unknown')}&background=random`,
      src: `https://www.youtube.com/embed/${csvVideo.id}`,
      thumbnail: getHighQualityThumbnail(csvVideo.id, csvVideo.thumbnailUrl || ''),
      caption: csvVideo.title || 'Untitled',
      description: csvVideo.description || '',
      publishedAt: csvVideo.publishDate || new Date().toISOString(),
      category: this.mapCategory(this.categorizeVideo(csvVideo)),
      originalCategory: this.categorizeVideo(csvVideo),
      isFollowed: false,
      views: csvVideo.viewCount || 0,
      likes: csvVideo.likeCount || 0,
      comments: csvVideo.commentCount || 0,
      shares: Math.floor((csvVideo.commentCount || 0) * 0.1), // Estimate shares
      age: this.formatUploadDate(csvVideo.publishDate),
      duration: this.generateRandomDuration(),
      // Add CSV-specific metrics
      engagementRate: csvVideo.engagementRate || 0,
      popularityScore: csvVideo.popularityScore || 0,
      trendingScore: csvVideo.trendingScore || 0,
      videoTags: csvVideo.videoTags || [],
      dailyRank: csvVideo.dailyRank || 0,
      dailyMovement: csvVideo.dailyMovement || 0,
      weeklyMovement: csvVideo.weeklyMovement || 0
    };
  }

  /**
   * Get random videos for discovery
   * @param {number} count - Number of videos to return
   * @returns {Promise<Array>} Array of random video objects
   */
  async getRandomVideos(count = 10) {
    await this.ensureLoaded();
    
    // Get random videos from CSV data
    const shuffled = this.csvData.sort(() => 0.5 - Math.random());
    return shuffled
      .slice(0, count)
      .map(video => this.transformCSVVideoToAppFormat(video))
      .filter(video => video !== null);
  }

  /**
   * Get most popular videos
   * @param {number} count - Number of videos to return
   * @returns {Promise<Array>} Array of most popular videos
   */
  async getMostPopularVideos(count = 20) {
    try {
      // Use backend API for popular videos
      const response = await apiService.getPopularVideos({ limit: count });
      return apiService.transformVideosToFrontendFormat(response.videos || []);
    } catch (error) {
      console.error('Popular videos failed, falling back to CSV:', error);
      // Fallback to CSV
      await this.ensureLoaded();
      const popularVideos = await csvParserService.getMostPopularVideos(count);
      return popularVideos
        .map(video => this.transformCSVVideoToAppFormat(video))
        .filter(video => video !== null);
    }
  }

  /**
   * Get trending videos
   * @param {number} count - Number of videos to return
   * @returns {Promise<Array>} Array of trending videos
   */
  async getTrendingVideos(count = 20) {
    try {
      // Use backend API for trending videos
      const response = await apiService.getTrendingVideos({ limit: count });
      return apiService.transformVideosToFrontendFormat(response.videos || []);
    } catch (error) {
      console.error('Trending videos failed, falling back to CSV:', error);
      // Fallback to CSV
      await this.ensureLoaded();
      const trendingVideos = await csvParserService.getTopTrendingVideos(count);
      return trendingVideos
        .map(video => this.transformCSVVideoToAppFormat(video))
        .filter(video => video !== null);
    }
  }

  /**
   * Get recommendations for a user
   * @param {string} userId - User identifier
   * @param {string} type - Recommendation type (collaborative, content, hybrid, popular, trending)
   * @param {number} count - Number of recommendations
   * @returns {Promise<Array>} Array of recommended videos
   */
  async getRecommendations(userId, type = 'hybrid', count = 20) {
    try {
      let recommendations = [];
      
      switch (type) {
        case 'collaborative':
          const collaborativeResponse = await apiService.getCollaborativeRecommendations(userId, { limit: count });
          recommendations = apiService.transformVideosToFrontendFormat(collaborativeResponse.recommendations || []);
          break;
        case 'content':
          // For content-based, we need a reference video - use user's most liked video
          const userPrefs = this.recommendationEngine?.userPreferences?.get(userId);
          if (userPrefs && userPrefs.likedVideos.size > 0) {
            const likedVideoId = Array.from(userPrefs.likedVideos)[0];
            const contentResponse = await apiService.getContentBasedRecommendations(likedVideoId, { limit: count });
            recommendations = apiService.transformVideosToFrontendFormat(contentResponse.recommendations || []);
          } else {
            recommendations = await this.getMostPopularVideos(count);
          }
          break;
        case 'hybrid':
          const hybridResponse = await apiService.getHybridRecommendations(userId, { limit: count });
          recommendations = apiService.transformVideosToFrontendFormat(hybridResponse.recommendations || []);
          break;
        case 'popular':
          recommendations = await this.getMostPopularVideos(count);
          break;
        case 'trending':
          recommendations = await this.getTrendingVideos(count);
          break;
        case 'recent':
          // Fallback to CSV for recent activity
          await this.ensureLoaded();
          if (this.recommendationEngine) {
            recommendations = await this.recommendationEngine.getRecentActivityRecommendations(userId, count);
            recommendations = recommendations
              .map(video => this.transformCSVVideoToAppFormat(video))
              .filter(video => video !== null);
          } else {
            recommendations = await this.getMostPopularVideos(count);
          }
          break;
        default:
          recommendations = await this.getMostPopularVideos(count);
      }

      return recommendations;
    } catch (error) {
      console.error('Recommendations failed, falling back to CSV:', error);
      // Fallback to CSV-based recommendations
      await this.ensureLoaded();
      
      if (!this.recommendationEngine) {
        return this.getMostPopularVideos(count);
      }

      let recommendations = [];
      
      switch (type) {
        case 'collaborative':
          recommendations = await this.recommendationEngine.getCollaborativeRecommendations(userId, count);
          break;
        case 'content':
          const userPrefs = this.recommendationEngine.userPreferences.get(userId);
          if (userPrefs && userPrefs.likedVideos.size > 0) {
            const likedVideoId = Array.from(userPrefs.likedVideos)[0];
            recommendations = await this.recommendationEngine.getContentBasedRecommendations(likedVideoId, count);
          } else {
            recommendations = await this.getMostPopularVideos(count);
          }
          break;
        case 'hybrid':
          recommendations = await this.recommendationEngine.getHybridRecommendations(userId, count);
          break;
        case 'popular':
          recommendations = await this.getMostPopularVideos(count);
          break;
        case 'trending':
          recommendations = await this.getTrendingVideos(count);
          break;
        case 'recent':
          recommendations = await this.recommendationEngine.getRecentActivityRecommendations(userId, count);
          break;
        default:
          recommendations = await this.getMostPopularVideos(count);
      }

      return recommendations
        .map(video => this.transformCSVVideoToAppFormat(video))
        .filter(video => video !== null);
    }
  }

  /**
   * Add user interaction for recommendation learning
   * @param {string} userId - User identifier
   * @param {string} videoId - Video identifier
   * @param {string} action - Action type (like, view, share, dislike)
   * @param {number} score - Preference score (1-10)
   */
  async addUserInteraction(userId, videoId, action, score = 5) {
    try {
      // Send interaction to backend API
      await apiService.recordInteraction(userId, videoId, action, score);
    } catch (error) {
      console.error('Failed to record interaction in backend:', error);
    }
    
    // Also record locally for fallback
    if (this.recommendationEngine) {
      this.recommendationEngine.addUserPreference(userId, videoId, action, score);
    }
  }

  /**
   * Get user preference summary
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User preference summary
   */
  async getUserPreferenceSummary(userId) {
    await this.ensureLoaded();
    
    if (!this.recommendationEngine) {
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

    return this.recommendationEngine.getUserPreferenceSummary(userId);
  }

  /**
   * Get diverse videos from different categories
   * @param {number} totalCount - Total number of videos to return
   * @returns {Promise<Array>} Array of diverse videos from different categories
   */
  async getDiverseVideos(totalCount = 12) {
    try {
      // Use backend API for diverse videos
      const response = await apiService.getDiverseVideos({ limit: totalCount });
      return apiService.transformVideosToFrontendFormat(response.videos || []);
    } catch (error) {
      console.error('Diverse videos failed, falling back to CSV:', error);
      // Fallback to CSV-based diverse selection
      await this.ensureLoaded();
      
      const categories = {
        'Entertainment & Comedy': [],
        'Gaming': [],
        'Music': [],
        'News & Politics': [],
        'Education': [],
        'Science & Technology': [],
        'Sports': [],
        'Travel & Events': [],
        'Howto & Style': [],
        'People & Blogs': []
      };

      // Categorize all videos
      this.csvData.forEach(video => {
        const category = this.categorizeVideo(video);
        if (categories[category]) {
          categories[category].push(video);
        }
      });

      // Sort each category by trending score
      Object.keys(categories).forEach(category => {
        categories[category].sort((a, b) => b.trendingScore - a.trendingScore);
      });

      // Select videos from each category
      const selectedVideos = [];
      const videosPerCategory = Math.ceil(totalCount / Object.keys(categories).length);
      
      Object.keys(categories).forEach(category => {
        const categoryVideos = categories[category].slice(0, videosPerCategory);
        selectedVideos.push(...categoryVideos);
      });

      // Shuffle and take the requested number
      const shuffled = selectedVideos.sort(() => Math.random() - 0.5);
      return shuffled
        .slice(0, totalCount)
        .map(video => this.transformCSVVideoToAppFormat(video))
        .filter(video => video !== null);
    }
  }

  /**
   * Get video statistics
   * @returns {Promise<Object>} Video statistics
   */
  async getVideoStatistics() {
    await this.ensureLoaded();
    return await csvParserService.getStatistics();
  }

  /**
   * Perform search across all videos
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Filtered video results
   */
  performSearch(query, options = {}) {
    if (!query || query.trim().length === 0) {
      return this.getAllVideosSync();
    }

    const lowerCaseQuery = query.toLowerCase();
    const allVideos = this.getAllVideosSync();
    
    const filteredResults = allVideos.filter(video => {
      const searchableText = [
        video.caption, // Use caption instead of title
        video.description,
        video.creator, // Use creator instead of channelName
        video.category,
        video.originalCategory || '' // Include original category for better search
      ].join(' ').toLowerCase();
      
      // Check for exact matches first
      if (searchableText.includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check for partial word matches
      const queryWords = lowerCaseQuery.split(' ').filter(word => word.length > 0);
      return queryWords.some(word => searchableText.includes(word));
    });

    // Sort by relevance (simple implementation)
    return this.sortByRelevance(filteredResults, lowerCaseQuery);
  }

  /**
   * Get all videos synchronously
   * @returns {Array} All video objects
   */
  getAllVideosSync() {
    const allVideos = [];
    Object.entries(this.database).forEach(([categoryName, categoryVideos]) => {
      allVideos.push(...this.transformVideos(categoryVideos, categoryName));
    });
    return allVideos;
  }

  /**
   * Transform database videos to app format
   * @param {Array} videos - Raw video data from database
   * @param {string} originalCategory - Original category name from database
   * @returns {Array} Transformed video objects
   */
  transformVideos(videos, originalCategory = '') {
    return videos.map(video => ({
      id: video.id,
      type: 'video',
      creator: video.channelName,
      handle: `@${video.channelName.toLowerCase().replace(/\s+/g, '')}`,
      avatar: video.channelAvatarUrl,
      src: `https://www.youtube.com/embed/${video.id}`, // Placeholder for now
      thumbnail: getHighQualityThumbnail(video.id, video.thumbnailUrl || ''),
      caption: video.title,
      description: video.description,
      publishedAt: new Date().toISOString(), // Placeholder
      category: this.mapCategory(originalCategory || 'Entertainment & Comedy'),
      originalCategory: originalCategory, // Keep original category for search
      isFollowed: false,
      views: this.parseViews(video.views),
      likes: Math.floor(Math.random() * 10000), // Random likes for demo
      comments: Math.floor(Math.random() * 1000), // Random comments for demo
      shares: Math.floor(Math.random() * 100), // Random shares for demo
      age: video.uploadedAt,
      duration: video.duration
    }));
  }

  /**
   * Map database categories to app categories
   * @param {string} dbCategory - Database category
   * @returns {string} App category
   */
  mapCategory(dbCategory) {
    const categoryMap = {
      'Entertainment & Comedy': 'entertainment',
      'Gaming': 'gaming',
      'Vlogs & Lifestyle': 'travel',
      'Education & How-To': 'tech'
    };
    
    return categoryMap[dbCategory] || 'entertainment';
  }

  /**
   * Parse views string to number
   * @param {string} viewsString - Views string like "3.4M views"
   * @returns {number} Number of views
   */
  parseViews(viewsString) {
    if (!viewsString) return 0;
    
    const match = viewsString.match(/(\d+\.?\d*)([KMB]?)\s*views?/i);
    if (!match) return 0;
    
    const number = parseFloat(match[1]);
    const suffix = match[2].toUpperCase();
    
    switch (suffix) {
      case 'K': return Math.floor(number * 1000);
      case 'M': return Math.floor(number * 1000000);
      case 'B': return Math.floor(number * 1000000000);
      default: return Math.floor(number);
    }
  }

  /**
   * Sort videos by relevance to search query
   * @param {Array} videos - Video array
   * @param {string} query - Search query
   * @returns {Array} Sorted video array
   */
  sortByRelevance(videos, query) {
    return videos.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, query);
      const bScore = this.calculateRelevanceScore(b, query);
      return bScore - aScore;
    });
  }

  /**
   * Calculate relevance score for a video
   * @param {Object} video - Video object
   * @param {string} query - Search query
   * @returns {number} Relevance score
   */
  calculateRelevanceScore(video, query) {
    let score = 0;
    const queryWords = query.split(' ').filter(word => word.length > 0);
    
    queryWords.forEach(word => {
      // Title matches get highest score
      if (video.caption.toLowerCase().includes(word)) {
        score += 10;
      }
      
      // Description matches get medium score
      if (video.description.toLowerCase().includes(word)) {
        score += 5;
      }
      
      // Channel name matches get low score
      if (video.creator.toLowerCase().includes(word)) {
        score += 2;
      }
      
      // Category matches get low score
      if (video.category.toLowerCase().includes(word)) {
        score += 1;
      }
    });
    
    return score;
  }

  /**
   * Get available categories
   * @returns {Array} Array of category names
   */
  getCategories() {
    return Object.keys(this.database);
  }

  /**
   * Get video count by category
   * @returns {Object} Category counts
   */
  getCategoryCounts() {
    const counts = {};
    Object.keys(this.database).forEach(category => {
      counts[category] = this.database[category].length;
    });
    return counts;
  }
}

// Export singleton instance
export const videoDatabaseService = new VideoDatabaseService();
