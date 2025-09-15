import React, { useRef, useEffect } from 'react';
import { Heart, ThumbsDown, MessageCircle, Share2, Play, X } from 'lucide-react';
import { formatCount } from '../utils/helpers.js';
import { getHighQualityThumbnail, getThumbnailSrcSet } from '../utils/thumbnailUtils.js';

const VideoCard = ({ video, onCommentClick, onShareClick, onLikeClick, onDislikeClick, likedVideos, dislikedVideos, onVideoClick, isPlaying, onVideoPlay, onVideoStop, onVideoElementRef, onIframeRef }) => {
  const iframeRef = useRef(null);
  const videoContainerRef = useRef(null);
  
  if (!video) {
    return null;
  }
  
  const isShort = video.type === 'short';
  const containerClass = isShort ? "group" : "group col-span-1 sm:col-span-2";
  const aspectClass = isShort ? "aspect-[9/16]" : "aspect-video";
  
  const highQualityThumbnail = getHighQualityThumbnail(video.id || '', video.thumbnail || '');
  const thumbnailSrcSet = getThumbnailSrcSet(video.id || '');
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&cc_load_policy=0&start=0&end=&vq=hd720`;

  const ActionButton = ({ icon: Icon, value, onClick = () => {}, active = false }) => (
    <div onClick={(e) => { e.stopPropagation(); onClick(e); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
      <Icon size={16} className={`${active ? 'text-rose-500 fill-current' : ''} transition-colors`}/>
      {value && <span className={active ? 'text-rose-400' : ''}>{value}</span>}
    </div>
  );

  const handleLikeClick = () => {
    onLikeClick(video.id);
  };

  const handleDislikeClick = () => {
    onDislikeClick(video.id);
  };

  const handleCommentClick = () => {
    onCommentClick(video);
  };

  const handleShareClick = (e) => {
    onShareClick(e, video);
  };

  const handleVideoClick = () => {
    if (isPlaying) {
      onVideoStop();
    } else {
      onVideoPlay(video.id);
      if (onVideoElementRef && videoContainerRef.current) {
        onVideoElementRef(videoContainerRef.current);
      }
    }
  };

  const handleCloseVideo = () => {
    onVideoStop();
  };

  useEffect(() => {
    if (isPlaying && onVideoElementRef && videoContainerRef.current) {
      onVideoElementRef(videoContainerRef.current);
    }
    if (isPlaying && onIframeRef && iframeRef.current) {
      onIframeRef(iframeRef.current);
    }
  }, [isPlaying, video.id, onVideoElementRef, onIframeRef]);

  const isLiked = likedVideos?.has(video.id) || false;
  const isDisliked = dislikedVideos?.has(video.id) || false;
  const displayLikes = (video.likes || 0) + (isLiked ? 1 : 0) - (isDisliked && isLiked ? 1 : 0);

  return (
    <>
      <div className={containerClass}>
        <div ref={videoContainerRef} className={`relative ${aspectClass} bg-dark-soft-800/70 rounded-lg overflow-hidden cursor-pointer`}>
          {isPlaying ? (
            <div className="w-full h-full relative">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.caption || 'Video player'}
              />
              
              {/* Close button only - YouTube handles fullscreen and share */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseVideo(); }}
                  className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
                  title="Close video"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div onClick={handleVideoClick}>
              {video.thumbnail || video.id ? (
                <img 
                  src={highQualityThumbnail} 
                  alt={video.caption || 'Video thumbnail'}
                  srcSet={thumbnailSrcSet}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : video.src ? (
                <video 
                  src={video.src} 
                  controls 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No preview available</span>
                </div>
              )}
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300">
                <div className="bg-black bg-opacity-60 rounded-full p-3 group-hover:scale-110 transition-transform duration-300">
                  <Play size={24} className="text-white ml-1" fill="currentColor" />
                </div>
              </div>
              
              {/* Duration badge */}
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-start mt-2">
        {video.avatar ? (
          <img src={video.avatar} alt={video.creator || 'Creator'} className="w-9 h-9 rounded-full mt-1 flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full mt-1 flex-shrink-0 bg-gray-600 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {(video.creator || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="ml-3 flex-1">
          <p className="text-white font-semibold text-sm line-clamp-2">{video.caption || 'Untitled'}</p>
          <p className="text-gray-400 text-xs">{video.creator || 'Unknown'}</p>
          {!isShort && <p className="text-gray-400 text-xs">{`${formatCount(video.views || 0)} views • ${video.age || 'Unknown'}`}</p>}
          <div className="flex items-center gap-4 mt-2">
            <ActionButton 
              icon={Heart} 
              value={formatCount(displayLikes)} 
              active={isLiked} 
              onClick={handleLikeClick} 
            />
            <ActionButton 
              icon={ThumbsDown} 
              active={isDisliked} 
              onClick={handleDislikeClick} 
            />
            <ActionButton 
              icon={MessageCircle} 
              value={formatCount(video.comments || 0)} 
              onClick={handleCommentClick} 
            />
            <ActionButton 
              icon={Share2} 
              onClick={handleShareClick} 
            />
          </div>
        </div>
        </div>
      </div>
      
    </>
  );
};

export default VideoCard;
