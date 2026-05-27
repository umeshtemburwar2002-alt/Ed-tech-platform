/**
 * Production-Ready YouTube Utility Functions
 * Handles all YouTube URL formats, thumbnail fallbacks, and embed generation
 */

// Extract YouTube video ID from ANY valid YouTube URL format
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  
  const cleanUrl = url.trim();
  
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/live/VIDEO_ID
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      // Validate 11-character YouTube video ID format
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    }
  }
  
  return null;
}

// Validate YouTube URL
export function isValidYouTubeUrl(url) {
  return extractYouTubeVideoId(url) !== null;
}

// Generate YouTube thumbnail with fallback qualities
export function generateYouTubeThumbnailUrl(videoId, quality = 'high') {
  if (!videoId) return null;
  
  const qualityMap = {
    maxres: 'maxresdefault',
    high: 'hqdefault',
    medium: 'mqdefault',
    default: 'default',
  };
  
  const selectedQuality = qualityMap[quality] || qualityMap.high;
  return `https://img.youtube.com/vi/${videoId}/${selectedQuality}.jpg`;
}

// Get array of thumbnail URLs in fallback order
export function getThumbnailFallbackUrls(videoId) {
  if (!videoId) return [];
  
  return [
    generateYouTubeThumbnailUrl(videoId, 'maxres'),
    generateYouTubeThumbnailUrl(videoId, 'high'),
    generateYouTubeThumbnailUrl(videoId, 'medium'),
    generateYouTubeThumbnailUrl(videoId, 'default'),
  ];
}

// Generate YouTube embed URL with safe options
export function generateYouTubeEmbedUrl(videoId, options = {}) {
  if (!videoId) return null;
  
  const {
    autoplay = false,
    modestbranding = true,
    rel = false,
    fs = true,
    controls = true,
    enablejsapi = true,
  } = options;
  
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    modestbranding: modestbranding ? '1' : '0',
    rel: rel ? '1' : '0',
    fs: fs ? '1' : '0',
    controls: controls ? '1' : '0',
    enablejsapi: enablejsapi ? '1' : '0',
  });
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

// Get best available thumbnail (with fallback logic)
export async function getBestThumbnail(videoId) {
  if (!videoId) return null;
  
  const urls = getThumbnailFallbackUrls(videoId);
  
  for (const url of urls) {
    try {
      const isAccessible = await checkImageAccessibility(url);
      if (isAccessible) return url;
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// Check if an image URL is accessible
function checkImageAccessibility(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(false), 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
}
