import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, Wand2, RefreshCw, Loader2 } from 'lucide-react';
import VideoCard from './VideoCard.jsx';
import FilterDropdown from './FilterDropdown.jsx';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { FILTERS } from '../utils/constants.js';

const VideoGridPanel = ({ 
  videos, 
  onCommentClick, 
  onShareClick, 
  onSmartRecommend, 
  playlists, 
  allVideos, 
  likedVideoIds,
  onVideoInteraction,
  onVideoClick,
  onRefreshFeed,
  onLoadMore,
  hasMoreVideos = false,
  isLoadingMore = false
}) => {
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [likedVideos, setLikedVideos] = useState(new Set([2, 3]));
  const [dislikedVideos, setDislikedVideos] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState({});
  const [currentlyPlayingVideoId, setCurrentlyPlayingVideoId] = useState(null);
  const [playingVideoElement, setPlayingVideoElement] = useState(null);
  const [playingIframeRef, setPlayingIframeRef] = useState(null);
  
  const infiniteScrollRef = useInfiniteScroll(
    onLoadMore,
    hasMoreVideos,
    isLoadingMore,
    200
  );
  
  const handleLikeClick = (videoId) => {
    setLikedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
        if (onVideoInteraction) {
          onVideoInteraction(videoId, 'unlike', 0);
        }
      } else {
        newSet.add(videoId);
        if (onVideoInteraction) {
          onVideoInteraction(videoId, 'like', 8);
        }
      }
      return newSet;
    });
    setDislikedVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };
  
  const handleDislikeClick = (videoId) => {
    setDislikedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
        if (onVideoInteraction) {
          onVideoInteraction(videoId, 'undislike', 0);
        }
      } else {
        newSet.add(videoId);
        if (onVideoInteraction) {
          onVideoInteraction(videoId, 'dislike', 2);
        }
      }
      return newSet;
    });
    setLikedVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const FilterButton = ({ label, targetFilter, icon: Icon }) => (
    <button 
      onClick={() => setFilter(targetFilter)} 
      className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors backdrop-blur-lg flex items-center gap-2 ${
        filter === targetFilter 
          ? 'bg-rose-500 text-white' 
          : 'bg-dark-soft-800/70 text-gray-300 hover:bg-white/20'
      }`}
    >
      {Icon && <Icon size={16}/>}
      {label}
    </button>
  );

  const applyFilters = (videos, filters) => {
    let filteredVideos = [...videos];

    // Upload date filter
    if (filters.uploadDate) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.uploadDate) {
        case 'last_hour':
          filterDate.setHours(now.getHours() - 1);
          break;
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'this_week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'this_month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'this_year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredVideos = filteredVideos.filter(video => {
        if (!video.publishDate) return false;
        const videoDate = new Date(video.publishDate);
        return videoDate >= filterDate;
      });
    }

    // Type filter
    if (filters.type) {
      filteredVideos = filteredVideos.filter(video => {
        switch (filters.type) {
          case 'video':
            return video.type === 'video' || !video.type;
          case 'channel':
            return video.type === 'channel';
          case 'playlist':
            return video.type === 'playlist';
          case 'movie':
            return video.type === 'movie';
          default:
            return true;
        }
      });
    }

    // Duration filter
    if (filters.duration) {
      filteredVideos = filteredVideos.filter(video => {
        if (!video.duration) return false;
        
        // Parse duration (assuming format like "4:30" or "1:23:45")
        const durationParts = video.duration.split(':').map(Number);
        let totalMinutes = 0;
        
        if (durationParts.length === 2) {
          totalMinutes = durationParts[0] + durationParts[1] / 60;
        } else if (durationParts.length === 3) {
          totalMinutes = durationParts[0] * 60 + durationParts[1] + durationParts[2] / 60;
        }
        
        switch (filters.duration) {
          case 'under_4_min':
            return totalMinutes < 4;
          case '4_to_20_min':
            return totalMinutes >= 4 && totalMinutes <= 20;
          case 'over_20_min':
            return totalMinutes > 20;
          default:
            return true;
        }
      });
    }

    // Features filter (multiple selection)
    if (filters.features && filters.features.length > 0) {
      filteredVideos = filteredVideos.filter(video => {
        return filters.features.some(feature => {
          // This would need to be implemented based on actual video data structure
          // For now, we'll do basic checks
          switch (feature) {
            case 'live':
              return video.isLive || false;
            case '4k':
              return video.quality === '4K' || false;
            case 'hd':
              return video.quality === 'HD' || video.quality === '1080p' || false;
            case 'subtitles':
              return video.hasSubtitles || false;
            case 'creative_commons':
              return video.license === 'creative_commons' || false;
            case '360':
              return video.is360 || false;
            case 'vr180':
              return video.isVR180 || false;
            case '3d':
              return video.is3D || false;
            case 'hdr':
              return video.isHDR || false;
            case 'location':
              return video.hasLocation || false;
            case 'purchased':
              return video.isPurchased || false;
            default:
              return true;
          }
        });
      });
    }

    // Sort by filter
    if (filters.sortBy) {
      filteredVideos.sort((a, b) => {
        switch (filters.sortBy) {
          case 'upload_date':
            return new Date(b.publishDate || 0) - new Date(a.publishDate || 0);
          case 'view_count':
            return (b.views || 0) - (a.views || 0);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'relevance':
          default:
            // Keep original order for relevance
            return 0;
        }
      });
    }

    return filteredVideos;
  };

  const handleFiltersChange = (newFilters) => {
    setActiveFilters(newFilters);
  };

  const handleVideoPlay = (videoId) => {
    setCurrentlyPlayingVideoId(videoId);
  };

  const handleVideoStop = () => {
    // Try to pause the iframe if it exists
    if (playingIframeRef) {
      try {
        // For YouTube iframes, we can't directly control playback due to CORS
        // But we can remove the src to stop it
        playingIframeRef.src = '';
      } catch (error) {
        // Silently handle iframe stop errors
      }
    }
    
    setCurrentlyPlayingVideoId(null);
    setPlayingVideoElement(null);
    setPlayingIframeRef(null);
  };

  // Stop video when scrolled away from view using Intersection Observer
  useEffect(() => {
    if (!currentlyPlayingVideoId || !playingVideoElement) {
      return;
    }

    let timeoutId = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the video is not intersecting (not visible), stop it
          if (!entry.isIntersecting) {
            // Add a small delay to prevent stopping too quickly when scrolling fast
            timeoutId = setTimeout(() => {
              handleVideoStop();
            }, 100);
          } else {
            // Clear timeout if video becomes visible again
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }
        });
      },
      {
        // Video must be at least 50% visible to be considered "in view"
        threshold: 0.5,
        // Add some margin to prevent stopping too early
        rootMargin: '50px 0px 50px 0px'
      }
    );

    observer.observe(playingVideoElement);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  }, [currentlyPlayingVideoId, playingVideoElement]);


  // Apply filters to videos
  const filteredVideos = applyFilters(videos, activeFilters);

  const PersonalPanel = () => {
    const myLikedVideos = allVideos.filter(v => likedVideos.has(v.id));
    
    return (
      <div className="p-4 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Your Space</h2>
          <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Playlists</h3>
          <div className="space-y-6">
            {playlists.map(p => {
              const playlistVideos = allVideos.filter(v => p.videoIds.includes(v.id)).slice(0, 4);
              return (
                <div key={p.id} className="bg-dark-soft-800/70 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.videoIds.length} videos</p>
                    </div>
                    <button 
                      onClick={() => onSmartRecommend(p)} 
                      className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Wand2 size={16} />
                      Smart Recommend
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {playlistVideos.map(video => (
                      <div key={video.id} className="aspect-video bg-dark-soft-800/50 rounded overflow-hidden">
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.caption}
                            className="w-full h-full object-cover"
                          />
                        ) : video.src ? (
                          <video src={video.src} muted className="w-full h-full object-cover"></video>
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No preview</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Liked Videos ({myLikedVideos.length})</h3>
          {myLikedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myLikedVideos.map((video, index) => (
                <VideoCard 
                  key={video.key || `liked-video-${index}`} 
                  video={video} 
                  onCommentClick={onCommentClick}
                  onShareClick={onShareClick}
                  onLikeClick={handleLikeClick}
                  onDislikeClick={handleDislikeClick}
                  likedVideos={likedVideos}
                  dislikedVideos={dislikedVideos}
                  onVideoClick={onVideoClick}
                  isPlaying={currentlyPlayingVideoId === video.id}
                  onVideoPlay={handleVideoPlay}
                  onVideoStop={handleVideoStop}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-dark-soft-800/70 rounded-lg">
              <p className="text-gray-400">Videos you like will appear here.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        ref={infiniteScrollRef}
        className="flex-1 h-full bg-dark-soft-900/60 backdrop-blur-2xl overflow-y-auto p-6 relative auto-hide-scrollbar"
      >
      <div className="sticky top-0 z-10 flex items-center justify-between mb-6 py-2">
        <div className="flex items-center gap-3">
          <FilterDropdown onFiltersChange={handleFiltersChange} currentFilters={activeFilters} />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setFilter(filter === FILTERS.PERSONAL ? FILTERS.ALL : FILTERS.PERSONAL)} 
            className={`p-2 rounded-full transition-colors backdrop-blur-lg ${
              filter === FILTERS.PERSONAL 
                ? 'bg-rose-500 text-white' 
                : 'bg-dark-soft-800/70 text-gray-300 hover:bg-white/20'
            }`}
            title={filter === FILTERS.PERSONAL ? "Show All Videos" : "Personal"}
          >
            <User size={20}/>
          </button>
        </div>
      </div>
      
      {filter === FILTERS.PERSONAL ? (
        <PersonalPanel />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video, index) => (
                <VideoCard 
                  key={video.key || `video-${index}`} 
                  video={video} 
                  onCommentClick={onCommentClick}
                  onShareClick={onShareClick}
                  onLikeClick={handleLikeClick}
                  onDislikeClick={handleDislikeClick}
                  likedVideos={likedVideos}
                  dislikedVideos={dislikedVideos}
                  onVideoClick={onVideoClick}
                  isPlaying={currentlyPlayingVideoId === video.id}
                  onVideoPlay={handleVideoPlay}
                  onVideoStop={handleVideoStop}
                  onVideoElementRef={(element) => {
                    if (currentlyPlayingVideoId === video.id) {
                      setPlayingVideoElement(element);
                    }
                  }}
                  onIframeRef={(iframeRef) => {
                    if (currentlyPlayingVideoId === video.id) {
                      setPlayingIframeRef(iframeRef);
                    }
                  }}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-gray-400 mt-8">
                {Object.keys(activeFilters).length > 0 && Object.values(activeFilters).some(v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true))
                  ? 'No videos found matching your filters.'
                  : 'No videos found for your search.'
                }
              </p>
            )}
          </div>
          
          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading more videos...</span>
              </div>
            </div>
          )}
          
          {/* End of content indicator */}
          {!hasMoreVideos && filteredVideos.length > 0 && !isLoadingMore && (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-500 text-sm">You've reached the end of the feed</p>
            </div>
          )}
        </>
      )}
      </div>
      
    </>
  );
};

export default VideoGridPanel;
