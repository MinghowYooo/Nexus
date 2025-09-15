/**
 * YouTube Thumbnail Utilities
 * Provides functions to get high-quality YouTube thumbnails
 */

/**
 * Get the best available YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @param {string} fallbackUrl - Fallback thumbnail URL from CSV
 * @returns {string} High-quality thumbnail URL
 */
export const getHighQualityThumbnail = (videoId, fallbackUrl = '') => {
  if (!videoId) return fallbackUrl;
  
  // YouTube thumbnail quality options (in order of preference)
  const thumbnailOptions = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 1280x720
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,     // 480x360
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     // 320x180
    `https://img.youtube.com/vi/${videoId}/default.jpg`        // 120x90
  ];
  
  // Return the highest quality option
  return thumbnailOptions[0];
};

/**
 * Get multiple thumbnail sizes for responsive loading
 * @param {string} videoId - YouTube video ID
 * @returns {Object} Object with different thumbnail sizes
 */
export const getThumbnailSizes = (videoId) => {
  if (!videoId) return {};
  
  return {
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 1280x720
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,       // 480x360
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     // 320x180
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`       // 120x90
  };
};

/**
 * Check if a thumbnail URL is valid
 * @param {string} url - Thumbnail URL to check
 * @returns {Promise<boolean>} True if thumbnail exists
 */
export const checkThumbnailExists = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get the best available thumbnail with fallback
 * @param {string} videoId - YouTube video ID
 * @param {string} fallbackUrl - Fallback thumbnail URL
 * @returns {Promise<string>} Best available thumbnail URL
 */
export const getBestThumbnail = async (videoId, fallbackUrl = '') => {
  if (!videoId) return fallbackUrl;
  
  const thumbnailSizes = getThumbnailSizes(videoId);
  
  // Try each size in order of preference
  for (const [size, url] of Object.entries(thumbnailSizes)) {
    const exists = await checkThumbnailExists(url);
    if (exists) {
      return url;
    }
  }
  
  // If no YouTube thumbnails work, return fallback
  return fallbackUrl;
};

/**
 * Generate a responsive image srcSet for thumbnails
 * @param {string} videoId - YouTube video ID
 * @returns {string} srcSet string for responsive images
 */
export const getThumbnailSrcSet = (videoId) => {
  if (!videoId) return '';
  
  const sizes = getThumbnailSizes(videoId);
  
  return [
    `${sizes.default} 120w`,
    `${sizes.medium} 320w`,
    `${sizes.high} 480w`,
    `${sizes.maxres} 1280w`
  ].join(', ');
};

/**
 * Get YouTube video embed URL with optimal settings
 * @param {string} videoId - YouTube video ID
 * @param {Object} options - Embed options
 * @returns {string} YouTube embed URL
 */
export const getYouTubeEmbedUrl = (videoId, options = {}) => {
  if (!videoId) return '';
  
  const defaultOptions = {
    autoplay: 0,
    controls: 1,
    modestbranding: 1,
    rel: 0,
    showinfo: 0,
    iv_load_policy: 3,
    fs: 1,
    cc_load_policy: 0,
    vq: 'hd720', // High quality
    ...options
  };
  
  const params = new URLSearchParams(defaultOptions);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

/**
 * Get YouTube watch URL
 * @param {string} videoId - YouTube video ID
 * @returns {string} YouTube watch URL
 */
export const getYouTubeWatchUrl = (videoId) => {
  if (!videoId) return '';
  return `https://www.youtube.com/watch?v=${videoId}`;
};
