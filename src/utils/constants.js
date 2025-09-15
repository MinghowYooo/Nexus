// Application Constants

export const APP_CONFIG = {
  NAME: 'Nexus',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered video discovery platform'
};

export const VIDEO_TYPES = {
  SHORT: 'short',
  VIDEO: 'video'
};

export const FILTERS = {
  ALL: 'all',
  PERSONAL: 'personal'
};

export const UPLOAD_DATE_FILTERS = {
  LAST_HOUR: 'last_hour',
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_YEAR: 'this_year'
};

export const TYPE_FILTERS = {
  VIDEO: 'video',
  CHANNEL: 'channel',
  PLAYLIST: 'playlist',
  MOVIE: 'movie'
};

export const DURATION_FILTERS = {
  UNDER_4_MIN: 'under_4_min',
  FOUR_TO_TWENTY_MIN: '4_to_20_min',
  OVER_20_MIN: 'over_20_min'
};

export const FEATURE_FILTERS = {
  LIVE: 'live',
  FOUR_K: '4k',
  HD: 'hd',
  SUBTITLES: 'subtitles',
  CREATIVE_COMMONS: 'creative_commons',
  THREE_SIXTY: '360',
  VR180: 'vr180',
  THREE_D: '3d',
  HDR: 'hdr',
  LOCATION: 'location',
  PURCHASED: 'purchased'
};

export const SORT_BY_FILTERS = {
  RELEVANCE: 'relevance',
  UPLOAD_DATE: 'upload_date',
  VIEW_COUNT: 'view_count',
  RATING: 'rating'
};

export const CATEGORIES = {
  TECH: 'tech',
  COOKING: 'cooking',
  MUSIC: 'music',
  GAMING: 'gaming',
  FITNESS: 'fitness',
  TRAVEL: 'travel',
  ENTERTAINMENT: 'entertainment',
  BAKING: 'baking',
  CRAFTS: 'crafts',
  HISTORY: 'history',
  SCIENCE: 'science',
  FINANCE: 'finance'
};

export const MESSAGE_TYPES = {
  SYSTEM: 'system',
  COMMENT: 'comment',
  USER: 'user',
  AGENT: 'agent'
};

export const ASSISTANT_MODES = {
  CHAT: 'chat',
  COMMENTS: 'comments'
};

// Mock data for fallback when APIs are not available
export const MOCK_VIDEOS = [
  { 
    id: 1, 
    type: 'short', 
    creator: 'CodeWizard', 
    handle: '@codewizard', 
    avatar: 'https://placehold.co/100x100/7E22CE/FFFFFF?text=CW', 
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 
    likes: 1200, 
    comments: 88, 
    shares: 15, 
    caption: 'Mastering React hooks in 60 seconds! #react #coding #development', 
    isFollowed: false, 
    category: 'tech' 
  },
  { 
    id: 2, 
    type: 'short', 
    creator: 'SourdoughMaster', 
    handle: '@sourdoughking', 
    avatar: 'https://placehold.co/100x100/F97316/FFFFFF?text=SM', 
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 
    likes: 4500, 
    comments: 230, 
    shares: 112, 
    caption: 'Day 1: Creating your sourdough starter. It\'s easier than you think! #sourdough #baking #bread', 
    isFollowed: true, 
    category: 'baking' 
  },
  { 
    id: 3, 
    type: 'short', 
    creator: 'WoodworkPro', 
    handle: '@davebuilds', 
    avatar: 'https://placehold.co/100x100/854D0E/FFFFFF?text=WP', 
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 
    likes: 15200, 
    comments: 850, 
    shares: 980, 
    caption: 'How to build the perfect dovetail joint. #woodworking #diy #crafts', 
    isFollowed: false, 
    category: 'crafts' 
  }
];

export const MOCK_COMMENTS = [
  { 
    id: 1, 
    user: 'Alex', 
    handle: '@alex_codes', 
    avatar: 'https://placehold.co/100x100/3B82F6/FFFFFF?text=A', 
    text: "This is amazing, thank you so much for the clear instructions!"
  },
  { 
    id: 2, 
    user: 'Maria', 
    handle: '@woodworker_maria', 
    avatar: 'https://placehold.co/100x100/16A34A/FFFFFF?text=M', 
    text: "What kind of wood are you using here? It looks great."
  },
  { 
    id: 3, 
    user: 'Ben', 
    handle: '@benG', 
    avatar: 'https://placehold.co/100x100/F59E0B/FFFFFF?text=B', 
    text: "I tried this and my joints are a bit loose. Any tips for a tighter fit?"
  }
];

export const MOCK_PLAYLISTS = [
  { id: 1, name: 'Baking Recipes', videoIds: [2, 4] },
  { id: 2, name: 'Woodworking Fun', videoIds: [3, 6] }
];
