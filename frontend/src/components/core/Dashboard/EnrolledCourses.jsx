import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUserEnrolledCourses } from "../../../services/operations/profileAPI";
import { FaSpinner, FaPlay, FaYoutube, FaBookOpen, FaGraduationCap } from "react-icons/fa";

export default function EnrolledCourses() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.profile);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const { token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    load();
  }, [token]);

  const load = async () => {
    try {
      const data = await getUserEnrolledCourses(token);

      const merged = (data || []).map(row => ({
        ...row,
        id: row._id,
        progress: Math.round(row.progressPercentage || 0),
        instructor: {
          first_name: row.instructor?.firstName || 'Instructor',
          last_name:  row.instructor?.lastName || '',
          avatar_url: row.instructor?.image || '',
        },
        courseName: row.courseName,
        courseDescription: row.courseDescription,
        thumbnail: row.thumbnail,
      }));

      setCourses(merged);
    } catch (e) {
      console.error("[EnrolledCourses]", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <FaSpinner className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <FaGraduationCap className="text-slate-700 text-6xl" />
        <p className="text-richblack-300 text-center font-bold">You haven't enrolled in any courses yet.</p>
        <button
          onClick={() => navigate("/explore-courses")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-2xl transition-all"
        >
          Browse Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-richblack-5">
        Enrolled Courses <span className="text-indigo-400 font-black">({courses.length})</span>
      </h2>

      <div className="space-y-4">
        {courses.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-richblack-700 bg-richblack-800 p-5 flex flex-col gap-3 hover:border-white/10 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="h-20 w-32 rounded-xl overflow-hidden bg-richblack-900 border border-richblack-700 shrink-0">
                {c.thumbnail ? (
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="h-full w-full object-cover"
                    onError={e => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <FaYoutube className="text-richblack-600 text-2xl" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-richblack-50 line-clamp-2 text-base" title={c.title}>
                  {c.title}
                </h3>
                {c.instructor && (
                  <p className="text-xs mt-0.5 text-richblack-400">
                    {c.instructor.first_name} {c.instructor.last_name}
                  </p>
                )}
                {c.description && (
                  <p className="text-xs mt-1 text-richblack-400 line-clamp-2">{c.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-richblack-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${c.completed ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${c.progress || 0}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-black ${c.completed ? "text-emerald-400" : "text-richblack-300"}`}>
                    {c.completed ? "✓ Done" : `${c.progress || 0}%`}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/learn/${c.id}`)}
                  className="flex items-center gap-1.5 text-[11px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                >
                  <FaPlay className="text-[8px]" />
                  {c.completed ? "Review" : "Resume"}
                </button>
                <button
                  onClick={() => navigate(`/courses/${c.id}`)}
                  className="flex items-center gap-1.5 text-[11px] px-4 py-2 rounded-xl border border-richblack-600 text-richblack-200 hover:bg-richblack-700 font-black transition-all whitespace-nowrap"
                >
                  <FaBookOpen className="text-[8px]" />
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
