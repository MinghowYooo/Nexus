import { useState, useCallback } from 'react';
import { videoDatabaseService } from '../services/videoDatabase.js';

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
      // Use local video database
      const results = await videoDatabaseService.searchVideos(query);
      return results;
    } catch (dbError) {
      console.error('Video database search failed:', dbError);
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
