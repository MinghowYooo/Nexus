// API Configuration
export const API_CONFIG = {
  YOUTUBE: {
    BASE_URL: import.meta.env.VITE_YOUTUBE_API_URL || 'https://www.googleapis.com/youtube/v3',
    API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY,
    SEARCH_PARAMS: {
      part: 'snippet',
      type: 'video',
      maxResults: 20,
      order: 'relevance',
      videoDefinition: 'high',
      videoDuration: 'any'
    }
  },
  GEMINI: {
    BASE_URL: import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    MODEL: 'gemini-2.5-flash-preview-05-20'
  }
};

// Validate API keys
export const validateApiKeys = () => {
  const missing = [];
  
  if (!API_CONFIG.YOUTUBE.API_KEY) {
    missing.push('VITE_YOUTUBE_API_KEY');
  }
  
  if (!API_CONFIG.GEMINI.API_KEY) {
    missing.push('VITE_GEMINI_API_KEY');
  }
  
  if (missing.length > 0) {
    console.warn('Missing API keys:', missing.join(', '));
    return false;
  }
  
  return true;
};
