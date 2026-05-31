import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Bookmark, Star, Play, BookOpen } from 'lucide-react';
import { GlassCard, TabBar, Badge, ProgressBar, EmptyState } from '../../components/dashboard/Common';
import { getUserEnrolledCourses } from '../../services/operations/profileAPI';
import { FaSpinner, FaYoutube, FaGraduationCap } from 'react-icons/fa';


const CoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.profile);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState(new Set());
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const { token } = useSelector(s => s.auth);

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
        instructor_name: row.instructor 
          ? `${row.instructor.firstName || ''} ${row.instructor.lastName || ''}`.trim() 
          : 'Instructor',
        category: (row.category?.name || row.category) || 'Course',
        lastAccessed: new Date(row.updatedAt || row.createdAt || Date.now()).toLocaleDateString(),
        title: row.courseName,
        thumbnail: row.thumbnail,
      }));

      setCourses(merged);
    } catch (e) {
      console.error('[StudentCourses]', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter(c => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'In Progress' && !c.completed) ||
      (filter === 'Completed' && c.completed) ||
      (filter === 'Bookmarked' && bookmarks.has(c.id));
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleBookmark = (id) => {
    const next = new Set(bookmarks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBookmarks(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FaGraduationCap className="text-gray-700 text-6xl" />
        <p className="text-gray-400 font-bold text-center">
          You haven't enrolled in any courses yet.
        </p>
        <button
          onClick={() => navigate('/explore-courses')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-2xl transition-all"
        >
          Browse Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search your courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
          />
        </div>
        <TabBar tabs={['All', 'In Progress', 'Completed', 'Bookmarked']} active={filter} onChange={setFilter} />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((course) => (
            <GlassCard key={course.id} className="!p-0 overflow-hidden group">
              {/* Thumbnail */}
              <div className="h-40 relative overflow-hidden bg-gray-950">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaYoutube className="text-gray-700 text-5xl" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
                <div className="absolute top-4 left-4">
                  <Badge
                    text={course.completed ? 'Completed' : 'In Progress'}
                    color={course.completed ? 'emerald' : 'indigo'}
                  />
                </div>
                <button
                  onClick={() => toggleBookmark(course.id)}
                  className={`absolute top-4 right-4 p-2 backdrop-blur-md rounded-lg border border-white/10 transition-colors ${
                    bookmarks.has(course.id) ? 'bg-amber-500 text-white' : 'bg-black/20 text-white hover:text-amber-400'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                {/* Rating stars */}
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(course.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-gray-500 font-bold ml-1">{(course.rating || 0).toFixed(1)}</span>
                </div>

                <h4 className="text-lg font-bold text-white mb-2 line-clamp-2 h-14 group-hover:text-indigo-400 transition-colors">
                  {course.title}
                </h4>

                <p className="text-xs text-gray-400 font-medium mb-4">
                  By {course.instructor_name}
                </p>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>{course.completed ? 'COMPLETED' : 'PROGRESS'}</span>
                    <span className={course.completed ? 'text-emerald-400' : 'text-white'}>{course.progress}%</span>
                  </div>
                  <ProgressBar pct={course.progress} color={course.completed ? 'from-emerald-500 to-teal-600' : undefined} />
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                    Last: {course.lastAccessed}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/learn/${course.id}`)}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      {course.completed ? 'Review' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No courses found"
          subtitle="We couldn't find any courses matching your search or filters."
          ctaText="Clear all filters"
          onCta={() => { setFilter('All'); setSearch(''); }}
        />
      )}
    </div>
  );
};

export default CoursesPage;
