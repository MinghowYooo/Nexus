import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for infinite scrolling
 * @param {Function} loadMore - Function to call when more content should be loaded
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {boolean} isLoading - Whether currently loading
 * @param {number} threshold - Distance from bottom to trigger load (in pixels)
 * @returns {Object} Ref to attach to the scrollable container
 */
export const useInfiniteScroll = (loadMore, hasMore, isLoading, threshold = 200) => {
  const containerRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (isLoading || !hasMore) return;

    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom <= threshold) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return containerRef;
};
