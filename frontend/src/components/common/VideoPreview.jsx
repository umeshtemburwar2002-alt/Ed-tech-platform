import React, { useState, useEffect, useCallback } from "react";
import { FaYoutube, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaPlay } from "react-icons/fa";
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  generateYouTubeThumbnailUrl,
  getBestThumbnail,
} from "../../utils/youtubeUtils";

export default function VideoPreview({
  url,
  onVideoChange,
  className = "",
}) {
  const [videoId, setVideoId] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [thumbnail, setThumbnail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessibilityWarning, setAccessibilityWarning] = useState(false);

  // Stable callback with useCallback
  const handleVideoChange = useCallback(
    (videoData) => {
      if (onVideoChange) {
        onVideoChange(videoData);
      }
    },
    [onVideoChange]
  );

  useEffect(() => {
    // Reset play state when URL changes
    setIsPlaying(false);

    if (!url || url.trim() === "") {
      setVideoId(null);
      setIsValid(true);
      setThumbnail(null);
      setAccessibilityWarning(false);
      handleVideoChange({ videoId: null, thumbnail: null, isValid: true });
      return;
    }

    setIsLoading(true);
    setAccessibilityWarning(false);

    const id = extractYouTubeVideoId(url);
    
    if (id) {
      setVideoId(id);
      setIsValid(true);
      
      // Asynchronously fetch the best available thumbnail
      getBestThumbnail(id).then((bestThumb) => {
        if (bestThumb) {
          setThumbnail(bestThumb);
          setAccessibilityWarning(false);
          handleVideoChange({ videoId: id, thumbnail: bestThumb, isValid: true, isPrivateOrDeleted: false });
        } else {
          // If no thumbnail was accessible (404), it may be private or deleted
          const fallbackThumb = generateYouTubeThumbnailUrl(id, 'default');
          setThumbnail(fallbackThumb);
          setAccessibilityWarning(true);
          handleVideoChange({ videoId: id, thumbnail: fallbackThumb, isValid: true, isPrivateOrDeleted: true });
        }
        setIsLoading(false);
      }).catch(() => {
        const fallbackThumb = generateYouTubeThumbnailUrl(id, 'default');
        setThumbnail(fallbackThumb);
        setAccessibilityWarning(true);
        handleVideoChange({ videoId: id, thumbnail: fallbackThumb, isValid: true, isPrivateOrDeleted: true });
        setIsLoading(false);
      });
    } else {
      setVideoId(null);
      setIsValid(false);
      setThumbnail(null);
      setAccessibilityWarning(false);
      handleVideoChange({ videoId: null, thumbnail: null, isValid: false });
      setIsLoading(false);
    }
  }, [url, handleVideoChange]);

  return (
    <div className={className}>
      {url && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <FaSpinner className="text-yellow-50 animate-spin" />
                <span className="text-sm text-richblack-400 font-medium">Verifying YouTube video...</span>
              </>
            ) : isValid && videoId ? (
              <>
                <FaCheckCircle className="text-emerald-400" />
                <span className="text-sm text-emerald-400 font-semibold">Valid YouTube URL</span>
              </>
            ) : (
              <>
                <FaExclamationTriangle className="text-rose-500" />
                <span className="text-sm text-rose-500 font-semibold">Please enter a valid YouTube URL</span>
              </>
            )}
          </div>

          {thumbnail && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-richblack-900 rounded-xl overflow-hidden border border-richblack-700 shadow-2xl group">
                {isPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                ) : (
                  <>
                    <img
                      src={thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onClick={() => setIsPlaying(true)}
                    />
                    {/* Premium red Play Button overlay to avoid autoplay */}
                    <div
                      onClick={() => setIsPlaying(true)}
                      className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-rose-600 hover:bg-rose-700 hover:scale-110 transition-all duration-300 rounded-full flex items-center justify-center shadow-2xl shadow-rose-600/30">
                        <FaPlay className="text-white text-xl ml-1 fill-current" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-richblack-900/80 to-transparent flex items-end p-4 pointer-events-none">
                      <div className="flex items-center gap-2">
                        <FaYoutube className="text-rose-500 text-2xl" />
                        <span className="text-xs text-richblack-200 font-bold uppercase tracking-wider">
                          Preview Player
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Private or deleted video warning banner */}
              {accessibilityWarning && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs leading-relaxed animate-shake">
                  <FaExclamationTriangle className="mt-0.5 shrink-0 text-rose-500 text-sm" />
                  <div>
                    <p className="font-bold text-rose-200 mb-0.5">Warning: Video accessibility issue</p>
                    <p>This video may not be publicly accessible. Please check if the video is private, deleted, or geoblocked.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
