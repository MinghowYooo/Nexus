/**
 * CSV Parser Service
 * Handles parsing and processing of the trending YouTube videos CSV data
 */

export class CSVParserService {
  constructor() {
    this.videos = [];
    this.isLoaded = false;
    this.categories = {};
    this.loadPromise = null; // Lazy init
    this.debug = false; // Toggle verbose logging
  }

  /**
   * Load category mapping from JSON file
   */
  async loadCategories() {
    try {
      const response = await fetch('/US_category_id.json');
      if (response.ok) {
        const categoryData = await response.json();
        this.categories = {};
        categoryData.items.forEach(item => {
          this.categories[item.id] = item.snippet.title;
        });
        if (this.debug) console.log(`📂 Loaded ${Object.keys(this.categories).length} categories`);
      }
    } catch (error) {
      if (this.debug) console.warn('Failed to load category mapping:', error);
    }
  }

  /**
   * Get category name by ID
   * @param {string} categoryId - Category ID
   * @returns {string} Category name
   */
  getCategoryName(categoryId) {
    return this.categories[categoryId] || 'Unknown';
  }

  /**
   * Load and parse CSV data
   */
  async loadCSVData() {
    try {
      const response = await fetch('/trending_yt_videos_US_only.csv');
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.status}`);
      }
      
      const csvText = await response.text();
      if (this.debug) console.log(`📄 CSV text length: ${csvText.length} characters`);
      
      this.videos = this.parseCSV(csvText);
      this.isLoaded = true;
      if (this.debug) console.log(`📊 CSV data loaded successfully: ${this.videos.length} videos`);

      // Debug: Show sample videos
      if (this.debug && this.videos.length > 0) {
        console.log('📋 Sample video:', {
          title: this.videos[0].title,
          channel: this.videos[0].channelName,
          views: this.videos[0].viewCount,
          likes: this.videos[0].likeCount
        });
      }

      // Debug: Check for coffee videos in loaded data
      if (this.debug) {
        const coffeeVideos = this.videos.filter(video =>
          video.title && (video.title.toLowerCase().includes('coffee') ||
          (video.description && video.description.toLowerCase().includes('coffee')))
        );
        console.log(`☕ Coffee videos found in loaded data: ${coffeeVideos.length}`);
      }
    } catch (error) {
      if (this.debug) console.error('Failed to load CSV data:', error);
      this.videos = [];
      this.isLoaded = true;
    }
  }

  /**
   * Parse CSV text into array of video objects
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of video objects
   */
  parseCSV(csvText) {
    // Use a more robust CSV parsing approach
    const rows = this.parseCSVRows(csvText);
    if (this.debug) console.log(`📝 Total rows after CSV parsing: ${rows.length}`);

    if (rows.length === 0) {
      if (this.debug) console.warn('No rows found in CSV');
      return [];
    }

    if (rows.length < 2) {
      if (this.debug) console.warn('CSV has header but no data rows');
      return [];
    }

    const headers = rows[0];
    if (this.debug) console.log(`📋 Headers: ${headers.length} fields - ${headers.join(', ')}`);

    const videos = [];
    const seenIds = new Set();
    let parsedCount = 0;
    let errorCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      if (values.length === headers.length) {
        try {
          const video = this.createVideoObject(headers, values);
          if (video && !seenIds.has(video.id)) {
            seenIds.add(video.id);
            videos.push(video);
            parsedCount++;
          }
        } catch (error) {
          errorCount++;
          if (this.debug && errorCount <= 5) {
            console.warn(`Failed to create video object for row ${i + 1}:`, error);
          }
        }
      } else {
        errorCount++;
        if (this.debug && errorCount <= 5) {
          console.warn(`Row ${i + 1}: Expected ${headers.length} fields, got ${values.length}`);
        }
      }
    }

    if (this.debug) console.log(`✅ Successfully parsed: ${parsedCount} videos`);
    if (this.debug) console.log(`❌ Parse errors: ${errorCount}`);
    return videos;
  }

  /**
   * Parse CSV text into rows, properly handling quoted fields with newlines
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of rows, each row is an array of field values
   */
  parseCSVRows(csvText) {
    const rows = [];
    const lines = csvText.split('\n');
    let currentRow = '';
    let inQuotes = false;
    let expectedFieldCount = 0;

    if (this.debug) console.log(`📄 Processing ${lines.length} lines of CSV data`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Add the line to current row
      if (currentRow.length > 0) {
        currentRow += '\n' + line;
      } else {
        currentRow = line;
      }

      // Count quotes to determine if we're still inside a quoted field
      let quoteCount = 0;
      let escaped = false;

      for (let j = 0; j < currentRow.length; j++) {
        const char = currentRow[j];
        if (char === '"' && !escaped) {
          quoteCount++;
          escaped = false;
        } else if (char === '"' && escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else {
          escaped = false;
        }
      }

      // If we have an even number of quotes (or zero), we're not in a quoted field
      inQuotes = (quoteCount % 2) === 1;

      // If we're not in quotes, this is a complete row
      if (!inQuotes && currentRow.trim().length > 0) {
        try {
          const parsedRow = this.parseCSVLine(currentRow);
          if (parsedRow.length > 0) {
            // Set expected field count from header
            if (rows.length === 0) {
              expectedFieldCount = parsedRow.length;
              if (this.debug) console.log(`📋 Header detected with ${expectedFieldCount} fields`);
            }

            // Only add rows that have the expected number of fields
            if (parsedRow.length === expectedFieldCount) {
              rows.push(parsedRow);
            } else {
              // Only log first 3 field count warnings to reduce console spam
              if (this.debug && rows.length <= 3) {
                console.warn(`⚠️  Row ${rows.length + 1} has ${parsedRow.length} fields, expected ${expectedFieldCount}`);
              }
            }
          }
        } catch (error) {
          if (this.debug) console.warn(`Failed to parse row ${rows.length + 1}:`, error);
        }
        currentRow = '';
      }
    }

    // Handle any remaining incomplete row
    if (currentRow.trim().length > 0) {
      try {
        const parsedRow = this.parseCSVLine(currentRow);
        if (parsedRow.length === expectedFieldCount) {
          rows.push(parsedRow);
        }
      } catch (error) {
        if (this.debug) console.warn('Failed to parse final row:', error);
      }
    }

    if (this.debug) console.log(`✅ Successfully parsed ${rows.length} complete rows`);
    return rows;
  }


  /**
   * Parse a single CSV line handling quoted fields
   * @param {string} line - CSV line
   * @returns {Array} Array of field values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote (double quote)
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator outside quotes
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);

    // Trim whitespace from all fields
    return result.map(field => field.trim());
  }

  /**
   * Create video object from headers and values
   * @param {Array} headers - CSV headers
   * @param {Array} values - CSV values
   * @returns {Object|null} Video object or null if invalid
   */
  createVideoObject(headers, values) {
    try {
      const video = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        video[header] = value;
      });

      // Validate required fields - map CSV field names to expected names
      const channelName = video.channelTitle || video.channel_name;
      if (!video.video_id || !video.title || !channelName) {
        if (this.debug) console.warn('Missing required fields:', { video_id: !!video.video_id, title: !!video.title, channel_name: !!channelName });
        return null;
      }

      if (video.video_id.trim() === '' || video.title.trim() === '' || channelName.trim() === '') {
        if (this.debug) console.warn('Empty required fields:', { video_id: video.video_id, title: video.title, channel_name: channelName });
        return null;
      }

      // Transform and clean data
      return {
        id: video.video_id,
        title: video.title,
        channelName: channelName,
        channelId: video.channelId,
        dailyRank: parseInt(video.daily_rank) || 0,
        dailyMovement: parseInt(video.daily_movement) || 0,
        weeklyMovement: parseInt(video.weekly_movement) || 0,
        snapshotDate: video.snapshot_date,
        country: video.country,
        viewCount: parseInt(video.view_count) || 0,
        likeCount: parseInt(video.like_count) || 0,
        commentCount: parseInt(video.comment_count) || 0,
        description: video.description || '',
        thumbnailUrl: video.thumbnail_link || video.thumbnail_url || '',
        videoTags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
        categoryId: video.categoryId,
        category: this.getCategoryName(video.categoryId),
        publishDate: video.publishedAt || video.publish_date,
        language: video.language || 'en',
        // Calculate engagement metrics
        engagementRate: this.calculateEngagementRate(video),
        popularityScore: this.calculatePopularityScore(video),
        trendingScore: this.calculateTrendingScore(video)
      };
    } catch (error) {
      if (this.debug) console.warn('Failed to create video object:', error);
      return null;
    }
  }

  /**
   * Ensure data is loaded lazily
   */
  async ensureLoaded() {
    if (this.isLoaded) return;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        await Promise.all([
          this.loadCategories(),
          this.loadCSVData()
        ]);
      })();
    }
    await this.loadPromise;
  }

  /**
   * Calculate engagement rate (likes + comments) / views
   * @param {Object} video - Video data
   * @returns {number} Engagement rate
   */
  calculateEngagementRate(video) {
    const views = parseInt(video.view_count) || 0;
    const likes = parseInt(video.like_count) || 0;
    const comments = parseInt(video.comment_count) || 0;
    
    if (views === 0) return 0;
    return (likes + comments) / views;
  }

  /**
   * Calculate popularity score based on views and engagement
   * @param {Object} video - Video data
   * @returns {number} Popularity score
   */
  calculatePopularityScore(video) {
    const views = parseInt(video.view_count) || 0;
    const likes = parseInt(video.like_count) || 0;
    const comments = parseInt(video.comment_count) || 0;
    const engagementRate = this.calculateEngagementRate(video);
    
    // Weighted score: views (70%) + engagement (30%)
    const viewScore = Math.log10(views + 1) * 0.7;
    const engagementScore = engagementRate * 1000 * 0.3;
    
    return viewScore + engagementScore;
  }

  /**
   * Calculate trending score based on daily movement and rank
   * @param {Object} video - Video data
   * @returns {number} Trending score
   */
  calculateTrendingScore(video) {
    const dailyMovement = parseInt(video.daily_movement) || 0;
    const dailyRank = parseInt(video.daily_rank) || 1000;
    
    // Higher movement and lower rank = higher trending score
    const movementScore = Math.max(0, dailyMovement);
    const rankScore = Math.max(0, 1000 - dailyRank);
    
    return movementScore + rankScore;
  }

  /**
   * Get all videos
   * @returns {Promise<Array>} Array of all videos
   */
  async getAllVideos() {
    await this.ensureLoaded();
    return this.videos;
  }

  /**
   * Get videos by channel
   * @param {string} channelName - Channel name
   * @returns {Promise<Array>} Array of videos from channel
   */
  async getVideosByChannel(channelName) {
    await this.ensureLoaded();
    return this.videos.filter(video => 
      video.channelName.toLowerCase().includes(channelName.toLowerCase())
    );
  }

  /**
   * Get top trending videos
   * @param {number} limit - Number of videos to return
   * @returns {Promise<Array>} Array of top trending videos
   */
  async getTopTrendingVideos(limit = 50) {
    await this.ensureLoaded();
    return this.videos
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);
  }

  /**
   * Get most popular videos
   * @param {number} limit - Number of videos to return
   * @returns {Promise<Array>} Array of most popular videos
   */
  async getMostPopularVideos(limit = 50) {
    await this.ensureLoaded();
    return this.videos
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  /**
   * Search videos by query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching videos
   */
  async searchVideos(query) {
    await this.ensureLoaded();
    
    if (!query || query.trim().length === 0) {
      return this.getMostPopularVideos(20);
    }

    const lowerQuery = query.toLowerCase();
    
    const results = this.videos.filter(video => {
      const searchText = [
        video.title,
        video.channelName,
        video.description,
        ...video.videoTags
      ].join(' ').toLowerCase();
      
      return searchText.includes(lowerQuery);
    }).sort((a, b) => b.popularityScore - a.popularityScore);
    
    return results;
  }

  /**
   * Get video statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    await this.ensureLoaded();

    const totalVideos = this.videos.length;
    const totalViews = this.videos.reduce((sum, video) => sum + video.viewCount, 0);
    const totalLikes = this.videos.reduce((sum, video) => sum + video.likeCount, 0);
    const totalComments = this.videos.reduce((sum, video) => sum + video.commentCount, 0);
    
    const channels = new Set(this.videos.map(video => video.channelName));
    const uniqueChannels = channels.size;
    
    const avgEngagementRate = this.videos.reduce((sum, video) => sum + video.engagementRate, 0) / totalVideos;
    
    return {
      totalVideos,
      totalViews,
      totalLikes,
      totalComments,
      uniqueChannels,
      avgEngagementRate,
      avgViewsPerVideo: totalViews / totalVideos,
      avgLikesPerVideo: totalLikes / totalVideos
    };
  }
}

// Export singleton instance
export const csvParserService = new CSVParserService();
