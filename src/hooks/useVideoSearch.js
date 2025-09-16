import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService.js';

/**
 * Custom hook for video search functionality
 * Uses local video database for all search operations
 */
export const useVideoSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchVideos = useCallback(async (query) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use API service for search
      const response = await apiService.searchVideos(query, { limit: 20 });
      return response.videos || [];
    } catch (apiError) {
      console.error('API search failed:', apiError);
      setError('Search failed - please try again');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchVideosWithDelay = useCallback(async (query, delayMs = 300) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const results = await searchVideos(query);
        resolve(results);
      }, delayMs);
    });
  }, [searchVideos]);

  return {
    searchVideos,
    searchVideosWithDelay,
    isLoading,
    error
  };
};
