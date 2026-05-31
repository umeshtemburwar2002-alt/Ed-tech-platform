import React from 'react';
import { motion } from 'framer-motion';
import { FaClock, FaSignal, FaStar, FaPlay, FaHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import RatingStars from '../../common/RatingStars';
import { getYoutubeThumbnail } from '../../../utils/youtubeUtils';
import { addToWishlist, removeFromWishlist } from '../../../services/operations/wishlistAPI';

export default function CourseCard({ course }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const { wishlist } = useSelector((state) => state.wishlist);
  
  const {
    id,
    thumbnail,
    thumbnail_url,
    custom_thumbnail_url,
    final_thumbnail_url,
    youtube_thumbnail_url,
    youtube_video_url,
    preview_video_url,
    title,
    description,
    rating,
    duration,
    level,
    price,
    isFree,
  } = course;

  // ── Thumbnail priority: DB pre-computed > YouTube generated > uploaded ────────
  const youtubeUrl = preview_video_url || youtube_video_url || null;
  const dbThumb = final_thumbnail_url || youtube_thumbnail_url || null;
  const resolvedThumbnail = dbThumb || getYoutubeThumbnail(youtubeUrl) || custom_thumbnail_url || thumbnail_url || thumbnail || null;

  function handleImgError(e) {
    const src = e.target.src;
    if (youtubeUrl && src.includes('maxresdefault')) {
      const hq = getYoutubeThumbnail(youtubeUrl, 'hq');
      if (hq && hq !== src) { e.target.src = hq; return; }
    }
    const fallback = custom_thumbnail_url || thumbnail_url || thumbnail;
    if (fallback && src !== fallback) { e.target.src = fallback; return; }
    e.target.style.display = 'none';
  }

  const handleNavigate = () => {
    navigate(`/courses/${id}`);
  };

  const isWishlisted = wishlist.some((item) => item.id === id);

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (!token) {
      toast.error('Please log in to add to wishlist');
      return;
    }
    if (isWishlisted) {
      dispatch(removeFromWishlist(id, token));
    } else {
      dispatch(addToWishlist(id, course, token));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -10 }}
      onClick={handleNavigate}
      className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-richblack-50 group cursor-pointer relative"
    >
      {/* Top Image */}
      <div className="relative overflow-hidden aspect-video bg-gradient-to-br from-blue-100 to-indigo-100">
        {resolvedThumbnail ? (
          <img
            src={resolvedThumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaPlay className="text-4xl text-blue-300 opacity-50" />
          </div>
        )}
        {isFree && (
          <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg z-10">
            Free Demo
          </div>
        )}
        
        {/* Wishlist Button Overlay — only for logged-in students */}
        {token && user?.accountType === "Student" && (
          <button
            onClick={handleWishlistClick}
            className={`absolute top-4 right-4 z-20 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
              isWishlisted 
                ? 'bg-pink-500/90 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                : 'bg-white/30 text-white hover:bg-white/50 hover:scale-110'
            }`}
            title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <FaHeart className={isWishlisted ? "scale-110" : ""} />
          </button>
        )}
      </div>

      {/* Course Info */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-richblack-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="text-richblack-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <RatingStars Review_Count={rating} Star_Size={16} />
          <span className="text-sm font-semibold text-richblack-700">({rating})</span>
        </div>

        {/* Meta Details */}
        <div className="flex items-center justify-between py-4 border-t border-richblack-50 mb-4">
          <div className="flex items-center gap-2 text-richblack-600 text-xs font-medium">
            <FaClock className="text-blue-500" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-richblack-600 text-xs font-medium">
            <FaSignal className="text-blue-500" />
            <span>{level}</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-richblack-400 tracking-wider">Course Fee</span>
            <span className={`text-xl font-extrabold ${isFree ? 'text-emerald-600' : 'text-blue-600'}`}>
              {isFree ? 'FREE' : `₹${price}`}
            </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95"
          >
            Enroll Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

