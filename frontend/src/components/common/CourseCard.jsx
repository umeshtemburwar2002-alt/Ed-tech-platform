import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaPlay, FaClock, FaStar } from "react-icons/fa";
import { generateYouTubeThumbnailUrl } from "../../utils/youtubeUtils";

export default function CourseCard({ course, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  const thumbnail = course.preview_thumbnail
    || (course.preview_video_id ? generateYouTubeThumbnailUrl(course.preview_video_id) : null)
    || course.thumbnail;

  return (
    <div
      className="group bg-richblack-800 rounded-2xl border border-richblack-700 overflow-hidden hover:border-yellow-50/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/course/${course.id}`} className="block">
        <div className="relative aspect-video bg-richblack-900 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={course.title || course.course_name}
              className={`w-full h-full object-cover transition-all duration-300 ${isHovered ? "scale-105" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-richblack-500">
              <FaPlay className="text-4xl opacity-30" />
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-richblack-900/80 via-transparent to-transparent">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-yellow-50/90 flex items-center justify-center shadow-lg transition-all duration-300 ${isHovered ? "scale-110" : "scale-100"}`}>
                <FaPlay className="text-richblack-900 text-xl ml-1" />
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {course.is_free && (
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                Free
              </span>
            )}
            {course.video_duration && (
              <span className="px-2 py-1 rounded-lg bg-richblack-900/80 text-richblack-25 text-[10px] font-bold flex items-center gap-1">
                <FaClock /> {Math.floor(course.video_duration / 60)}m
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/course/${course.id}`} className="block flex-1">
            <h3 className="text-sm font-bold text-richblack-5 line-clamp-2 group-hover:text-yellow-50 transition-colors">
              {course.title || course.course_name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-50">
            <FaStar className="text-xs" />
            <span className="text-sm font-bold">4.8</span>
          </div>
          <p className="text-xs text-richblack-400">
            {course.enrollmentCount || 0} students
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-richblack-700">
          <p className="text-xl font-black text-richblack-5">
            {course.is_free ? "FREE" : `₹${course.price}`}
          </p>
        </div>
      </div>
    </div>
  );
}
