import React, { useRef, useEffect, useState } from 'react';
import { Twitter, Facebook, Link } from 'lucide-react';

const ShareMenu = ({ video, parentRef, onClose, showToast }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (parentRef && menuRef.current) {
      const parentRect = parentRef.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      setPosition({
        top: parentRect.top - menuRect.height - 8,
        left: parentRect.left + (parentRect.width / 2) - (menuRect.width / 2),
      });
    }
  }, [parentRef]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && parentRef && !parentRef.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, parentRef]);

  const handleShare = (platform) => {
    let text = '';
    if (platform === 'link') {
      const videoUrl = video.id ? `https://www.youtube.com/watch?v=${video.id}` : video.src;
      navigator.clipboard.writeText(videoUrl);
      text = `Copied link for "${video.caption}"`;
    } else {
      text = `Shared "${video.caption}" to ${platform}`;
    }
    showToast(text);
    onClose();
  };

  return (
    <div 
      ref={menuRef} 
      style={{ top: `${position.top}px`, left: `${position.left}px` }} 
      className="fixed z-50 bg-dark-soft-800/70 backdrop-blur-lg rounded-full flex items-center gap-2 p-2 animate-fade-in"
    >
      <button 
        onClick={() => handleShare('Twitter')} 
        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <Twitter size={18} />
      </button>
      <button 
        onClick={() => handleShare('Facebook')} 
        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <Facebook size={18} />
      </button>
      <button 
        onClick={() => handleShare('link')} 
        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <Link size={18} />
      </button>
    </div>
  );
};

export default ShareMenu;
