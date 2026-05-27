import React, { useState } from "react";
import { generateYouTubeEmbedUrl } from "../../utils/youtubeUtils";

export default function EmbeddedPlayer({
  videoId,
  videoProvider = "youtube",
  autoplay = false,
  className = "",
}) {
  const [isLoading, setIsLoading] = useState(true);

  if (!videoId) return null;

  const embedUrl =
    videoProvider === "youtube" ? generateYouTubeEmbedUrl(videoId, { autoplay }) : null;

  if (!embedUrl) {
    return (
      <div className="aspect-video bg-richblack-900 rounded-xl flex items-center justify-center border border-richblack-700">
        <p className="text-richblack-400 text-sm">Video not available</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video rounded-xl overflow-hidden border border-richblack-700 bg-black ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-richblack-900">
          <div className="w-10 h-10 border-4 border-yellow-50/30 border-t-yellow-50 rounded-full animate-spin" />
        </div>
      )}
      <iframe
        src={embedUrl}
        title="Video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
