import React, { useState, useRef, useEffect } from 'react';
import AssistantPanel from './components/AssistantPanel.jsx';
import VideoGridPanel from './components/VideoGridPanel.jsx';
import ShareMenu from './components/ShareMenu.jsx';
import { useVideoSearch } from './hooks/useVideoSearch.js';
import { videoDatabaseService } from './services/videoDatabase.js';
import { apiService } from './services/apiService.js';
import { MOCK_COMMENTS, MOCK_PLAYLISTS } from './utils/constants.js';

const API_BASE_URL = 'http://localhost:3001';

export default function App() {
  const [videoGrid, setVideoGrid] = useState([]);
  const [toast, setToast] = useState(null);
  const [shareMenu, setShareMenu] = useState(null);
  const [playlists, setPlaylists] = useState(MOCK_PLAYLISTS);
  const [currentUserId] = useState('user_' + Math.random().toString(36).substr(2, 9));
  const [recommendationType, setRecommendationType] = useState('trending');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const assistantRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const { searchVideos, isLoading: searchLoading, error: searchError } = useVideoSearch();

  const transformVideoData = (apiVideo) => {
    return {
      id: apiVideo.id,
      title: apiVideo.title,
      caption: apiVideo.title,
      creator: apiVideo.channel_name,
      channel: apiVideo.channel_name,
      thumbnail: apiVideo.thumbnail_url,
      views: parseInt(apiVideo.view_count) || 0,
      likes: parseInt(apiVideo.like_count) || 0,
      comments: parseInt(apiVideo.comment_count) || 0,
      description: apiVideo.description,
      tags: apiVideo.video_tags || [],
      category: apiVideo.category,
      publishDate: apiVideo.publish_date,
      age: apiVideo.publish_date ? new Date(apiVideo.publish_date).toLocaleDateString() : 'Unknown',
      avatar: null,
      src: null,
      duration: null,
      type: 'video'
    };
  };

  useEffect(() => {
    const loadInitialVideos = async () => {
      try {
        const response = await apiService.getAllVideos({ page: 1, limit: 20 });
        const transformedVideos = (response.videos || []).map(transformVideoData);
        const uniqueVideos = transformedVideos.filter((video, index, self) => 
          index === self.findIndex(v => v.id === video.id)
        );
        setVideoGrid(uniqueVideos);
        setCurrentPage(1);
        setHasMoreVideos(response.pagination?.hasNext || false);
      } catch (error) {
        console.error('Failed to load videos from API:', error);
        try {
          const url = `${API_BASE_URL}/api/videos/diverse?limit=20`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.videos && data.videos.length > 0) {
            const transformedVideos = data.videos.map(transformVideoData);
            const uniqueVideos = transformedVideos.filter((video, index, self) => 
              index === self.findIndex(v => v.id === video.id)
            );
            setVideoGrid(uniqueVideos);
            setCurrentPage(1);
            setHasMoreVideos(false);
          } else {
            throw new Error('No videos returned from diverse endpoint');
          }
        } catch (diverseError) {
          console.error('Failed to load diverse videos:', diverseError);
          // Final fallback to CSV endpoint
          try {
            const csvUrl = `${API_BASE_URL}/api/csv/videos?limit=20`;
            const csvResponse = await fetch(csvUrl);
            
            if (csvResponse.ok) {
              const csvData = await csvResponse.json();
              const transformedVideos = csvData.videos.map(transformVideoData);
              setVideoGrid(transformedVideos);
              setCurrentPage(1);
              setHasMoreVideos(csvData.pagination?.hasNext || false);
            } else {
              throw new Error('CSV endpoint failed');
            }
          } catch (csvError) {
            console.error('Failed to load from CSV:', csvError);
            // Final fallback to local database
            try {
              const videos = await videoDatabaseService.getDiverseVideos(20);
              setVideoGrid(videos);
              setCurrentPage(1);
              setHasMoreVideos(false);
            } catch (finalError) {
              console.error('❌ Failed to load videos from all sources');
            }
          }
        }
      }
    };

    loadInitialVideos();
  }, []);

  const loadMoreVideos = async () => {
    if (isLoadingMore || !hasMoreVideos) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await apiService.getAllVideos({ page: nextPage, limit: 20 });
      
      if (response.videos && response.videos.length > 0) {
        const transformedVideos = response.videos.map(transformVideoData);
        setVideoGrid(prev => {
          const existingIds = new Set(prev.map(video => video.id));
          const newVideos = transformedVideos.filter(video => !existingIds.has(video.id));
          return [...prev, ...newVideos];
        });
        setCurrentPage(nextPage);
        setHasMoreVideos(response.pagination?.hasNext || false);
      } else {
        setHasMoreVideos(false);
      }
    } catch (error) {
      console.error('Failed to load more videos:', error);
      setHasMoreVideos(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleNewFeed = async (query) => {
    try {
      const results = await searchVideos(query);
      setVideoGrid(results.length > 0 ? results : []);
      setCurrentPage(1);
      setHasMoreVideos(false);
    } catch (error) {
      console.error('Search error:', error);
      setVideoGrid([]);
      setCurrentPage(1);
      setHasMoreVideos(false);
    }
  };

  const handleRecommendation = async (type = 'hybrid') => {
    try {
      setRecommendationType(type);
      const results = await videoDatabaseService.getRecommendations(currentUserId, type, 20);
      setVideoGrid(results);
      setCurrentPage(1);
      setHasMoreVideos(false);
    } catch (error) {
      console.error('Recommendation error:', error);
      console.error('❌ Failed to load recommendations');
    }
  };

  const handleVideoInteraction = async (videoId, action, score = 5) => {
    await videoDatabaseService.addUserInteraction(currentUserId, videoId, action, score);
  };
  
  const handleShowComments = (video) => {
    assistantRef.current?.loadComments(video, MOCK_COMMENTS);
  };

  const showToast = (message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleShareClick = (e, video) => {
    e.stopPropagation();
    setShareMenu({ video, ref: e.currentTarget });
  };

  const closeShareMenu = () => setShareMenu(null);

  const handleSmartRecommend = (playlist) => {
    assistantRef.current?.runSmartRecommend(playlist);
  };

  const handleUserPreference = (preference) => {
    showToast(`Learning your preferences: ${preference.sentiment} about ${preference.topic || 'content'}`);
  };

  const handleVideoClick = (video) => {
  };

  const handleCloseVideoPlayer = () => {
  };

  const handleRefreshFeed = async () => {
      try {
        const response = await apiService.getAllVideos({ page: 1, limit: 20 });
        const transformedVideos = (response.videos || []).map(transformVideoData);
        const uniqueVideos = transformedVideos.filter((video, index, self) => 
          index === self.findIndex(v => v.id === video.id)
        );
        setVideoGrid(uniqueVideos);
        setCurrentPage(1);
        setHasMoreVideos(response.pagination?.hasNext || false);
      } catch (error) {
        console.error('Failed to refresh videos from API:', error);
        // Fallback to diverse endpoint
        try {
          const url = `${API_BASE_URL}/api/videos/diverse?limit=20`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
        
          if (data.videos && data.videos.length > 0) {
            const transformedVideos = data.videos.map(transformVideoData);
            const uniqueVideos = transformedVideos.filter((video, index, self) => 
              index === self.findIndex(v => v.id === video.id)
            );
            setVideoGrid(uniqueVideos);
            setCurrentPage(1);
            setHasMoreVideos(false);
          } else {
            throw new Error('No videos returned from diverse endpoint');
          }
        } catch (diverseError) {
          console.error('Failed to refresh diverse videos:', diverseError);
          // Final fallback to CSV endpoint
          try {
            const csvUrl = `${API_BASE_URL}/api/csv/videos?limit=20`;
            const csvResponse = await fetch(csvUrl);
            
            if (csvResponse.ok) {
              const csvData = await csvResponse.json();
              const transformedVideos = csvData.videos.map(transformVideoData);
              setVideoGrid(transformedVideos);
              setCurrentPage(1);
              setHasMoreVideos(csvData.pagination?.hasNext || false);
            } else {
              throw new Error('CSV endpoint failed');
            }
          } catch (csvError) {
            console.error('Failed to refresh from CSV:', csvError);
            // Final fallback to local database
            try {
              const videos = await videoDatabaseService.getDiverseVideos(20);
              setVideoGrid(videos);
              setCurrentPage(1);
              setHasMoreVideos(false);
            } catch (finalError) {
              console.error('Failed to refresh from all sources');
            }
          }
        }
      }
    };

  return (
    <div 
      className="w-full h-screen font-sans flex max-w-full mx-auto shadow-2xl text-white bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url(https://placehold.co/1920x1080/1a121c/3a223c?text=Nexus+BG)' }}
    >
      {/* Global Styles */}
      <style>{`
        .prose { max-width: none; }
        .prose-invert { color: inherit; }
        .prose-sm { font-size: 0.9rem; }
        .line-clamp-2 { 
          display: -webkit-box; 
          -webkit-line-clamp: 2; 
          -webkit-box-orient: vertical; 
          overflow: hidden; 
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .auto-hide-scrollbar::-webkit-scrollbar { width: 8px; }
        .auto-hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .auto-hide-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
        .auto-hide-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
        .auto-hide-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translate(-50%, 10px); }
          10%, 90% { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 3s ease-in-out forwards;
        }
      `}</style>
      

      {/* Loading Indicator */}
      {searchLoading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-dark-soft-800/80 backdrop-blur-lg text-sm text-rose-400 px-4 py-2 rounded-full">
          Searching videos...
        </div>
      )}

      {/* Error Indicator */}
      {searchError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 backdrop-blur-lg text-sm text-red-400 px-4 py-2 rounded-full border border-red-500/30">
          {searchError}
        </div>
      )}
      
      <AssistantPanel 
        ref={assistantRef} 
        onNewFeed={handleNewFeed} 
        onUserPreference={handleVideoInteraction}
        onRecommendation={handleRecommendation}
      />
      <VideoGridPanel 
        videos={videoGrid} 
        onCommentClick={handleShowComments} 
        onShareClick={handleShareClick}
        onSmartRecommend={handleSmartRecommend}
        playlists={playlists}
        allVideos={videoGrid}
        onVideoInteraction={handleVideoInteraction}
        onVideoClick={handleVideoClick}
        onRefreshFeed={handleRefreshFeed}
        onLoadMore={loadMoreVideos}
        hasMoreVideos={hasMoreVideos}
        isLoadingMore={isLoadingMore}
      />

      {shareMenu && (
        <ShareMenu 
          video={shareMenu.video} 
          parentRef={shareMenu.ref} 
          onClose={closeShareMenu} 
          showToast={showToast} 
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-dark-soft-800/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm animate-fade-in-out">
          {toast}
        </div>
      )}

      {/* Video Player Modal - Removed, using inline playback instead */}
    </div>
  );
}
