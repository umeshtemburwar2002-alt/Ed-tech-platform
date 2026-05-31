import React from "react";
import { motion } from "framer-motion";
import { FaEye, FaEdit, FaTrash, FaUsers, FaStar, FaPlay } from "react-icons/fa";
import { getYoutubeThumbnail } from "../../../utils/youtubeUtils";

const STATUS = {
  draft:     "bg-slate-500/10  text-slate-400  border border-slate-500/20",
  published: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
  pending:   "bg-yellow-500/10  text-yellow-300  border border-yellow-500/40",
  rejected:  "bg-red-500/10  text-red-300  border border-red-500/40",
};

const CourseRow = React.forwardRef(({ course, onView, onEdit, onDelete }, ref) => {
  // Resolve thumbnail using correct DB column names
  // Priority: DB pre-computed > YouTube generated > uploaded > null
  const dbThumbnail = course.final_thumbnail_url || course.youtube_thumbnail_url || null;
  const youtubeUrl =
    course.preview_video_url ||
    course.youtube_video_url ||
    null;
  const youtubeThumbnail = dbThumbnail || getYoutubeThumbnail(youtubeUrl);
  const uploadedThumbnail = course.custom_thumbnail_url || course.thumbnail_url || course.thumbnail || null;
  const resolvedThumbnail = youtubeThumbnail || uploadedThumbnail || null;

  function handleImgError(e) {
    const src = e.target.src;
    if (youtubeUrl && src.includes("maxresdefault")) {
      const hq = getYoutubeThumbnail(youtubeUrl, "hq");
      if (hq && hq !== src) { e.target.src = hq; return; }
    }
    if (uploadedThumbnail && src !== uploadedThumbnail) { e.target.src = uploadedThumbnail; return; }
    e.target.style.display = "none";
  }

  return (
    <motion.tr
      ref={ref}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="hover:bg-richblack-700/20 transition-all group border-b border-richblack-700/40 last:border-0"
    >
      {/* Course Info */}
      <td className="py-5 px-6">
        <div className="flex items-center gap-4">
          <div className="w-20 aspect-video rounded-lg overflow-hidden bg-richblack-900 border border-richblack-700 shrink-0 flex items-center justify-center">
            {resolvedThumbnail ? (
              <img
                src={resolvedThumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={handleImgError}
                loading="lazy"
              />
            ) : (
              <FaPlay className="text-richblack-600 text-lg" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-richblack-5 line-clamp-1 text-sm group-hover:text-yellow-50 transition-colors">{course.title}</p>
            <p className="text-[10px] text-richblack-500 mt-0.5 uppercase font-bold tracking-wider">{course.level}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <FaUsers className="text-blue-400" /> {course.studentsEnrolled?.length ?? 0}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <FaStar className="text-yellow-400" /> {course.rating ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-5 px-6">
        <span className="text-xs font-medium text-richblack-300">
          {course.category?.name ?? course.category ?? "—"}
        </span>
      </td>

      {/* Status */}
      <td className="py-5 px-6">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${STATUS[course.status] ?? STATUS.draft}`}>
          {course.status?.toUpperCase()}
        </span>
      </td>

      {/* Price */}
      <td className="py-5 px-6">
        <p className="font-bold text-richblack-50 text-sm">
          {Number(course.price) > 0 ? `₹${course.price}` : <span className="text-emerald-400">FREE</span>}
        </p>
      </td>

      {/* Actions */}
      <td className="py-5 px-6">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onView(course)}
            title="View Details"
            className="p-2.5 rounded-xl bg-richblack-700 text-blue-300 hover:bg-blue-500 hover:text-white transition-all shadow-md hover:scale-110 active:scale-95"
          >
            <FaEye className="text-sm" />
          </button>
          <button
            onClick={() => onEdit(course)}
            title="Edit Course"
            className="p-2.5 rounded-xl bg-richblack-700 text-yellow-50 hover:bg-yellow-50 hover:text-richblack-900 transition-all shadow-md hover:scale-110 active:scale-95"
          >
            <FaEdit className="text-sm" />
          </button>
          <button
            onClick={() => onDelete(course)}
            title="Delete Course"
            className="p-2.5 rounded-xl bg-richblack-700 text-pink-300 hover:bg-red-500 hover:text-white transition-all shadow-md hover:scale-110 active:scale-95"
          >
            <FaTrash className="text-sm" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
});

CourseRow.displayName = "CourseRow";

export default CourseRow;

