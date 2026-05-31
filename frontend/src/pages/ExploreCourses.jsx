import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Star, Users, Clock, Tag, Heart, Share2, ShoppingCart } from 'lucide-react';
import RatingStars from '../components/common/RatingStars';
import Footer from '../components/common/Footer';
import CourseCard from '../components/common/CourseCard';
import { supabase } from '../config/supabaseClient';
import { getYoutubeThumbnail } from '../utils/youtubeUtils';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { addToWishlist, removeFromWishlist } from '../services/operations/wishlistAPI';
import { addToCart } from '../slices/cartSlice';

const bgPattern = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
};

const ExploreCourses = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.profile);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [category, setCategory] = useState('all');
  const [flyingHearts, setFlyingHearts] = useState([]);

  const handleAddToCart = (course, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error('Please log in to add to cart');
      return;
    }
    dispatch(addToCart(course));
    // toast.success removed to avoid duplicate notification (cartSlice already shows toast)
  };

  const handleToggleWishlist = (course, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error('Please log in to add to wishlist');
      return;
    }
    const isWishlisted = wishlist.some((item) => item.id === course.id);
    if (isWishlisted) {
      dispatch(removeFromWishlist(course.id, token));
    } else {
      const newHeart = { id: Date.now(), x: e.clientX, y: e.clientY };
      setFlyingHearts(prev => [...prev, newHeart]);
      
      setTimeout(() => {
        setFlyingHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 1000);
      
      dispatch(addToWishlist(course.id, course, token));
    }
  };

  const handleShare = (course, e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/courses/${course.id}`;
    if (navigator.share) {
      navigator.share({
        title: course.title || course.course_name,
        text: course.description || course.short_description,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Course link copied to clipboard!');
    }
  };

  // Fetch user enrollments
  useEffect(() => {
    if (user?.id) {
      const fetchEnrollments = async () => {
        const { data } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("student_id", user.id);
        if (data) {
          setEnrolledCourseIds(new Set(data.map(d => d.course_id)));
        }
      };
      fetchEnrollments();
    }
  }, [user]);

  // Fetch all published courses from Supabase directly
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await supabase
          .from("courses")
          .select(`
            id,
            title,
            description,
            short_description,
            price,
            thumbnail,
            thumbnail_url,
            custom_thumbnail_url,
            final_thumbnail_url,
            thumbnail_source,
            youtube_thumbnail_url,
            youtube_video_url,
            youtube_video_id,
            preview_video_url,
            tags,
            category_id,
            status,
            created_at,
            sold_count,
            is_free,
            level,
            rating,
            total_students,
            is_featured,
            instructor:instructor_id(first_name, last_name, avatar_url, image)
          `)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (response && !response.error && response.data) {
          const enrichedCourses = response.data.map(course => ({
            ...course,
            course_name: course.title,
            course_description: course.description,
            enrolled_students_count: course.sold_count || 0,
            instructor: course.instructor || {
              first_name: "Instructor",
              last_name: "",
              avatar_url: null,
              image: null
            },
          }));
          
          setCourses(enrichedCourses);
          setFilteredCourses(enrichedCourses);
        } else {
          setCourses([]);
          setFilteredCourses([]);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
        setFilteredCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Filter and sort courses
  useEffect(() => {
    let result = [...courses];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        course =>
          course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.course_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sorting
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        break;
    }

    setFilteredCourses(result);
  }, [courses, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#070B19]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-slate-900/30 py-24 border-b border-white/5">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-purple-500/10 to-transparent blur-[80px] -z-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 tracking-tight">
              Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">Courses</span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium">
              Discover courses from top instructors. Learn anything, anywhere.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search for courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-[#0B1228]/80 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-2xl text-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0B1228] border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 appearance-none hover:bg-[#0B1228]/80 cursor-pointer transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest Additions</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          
          <div className="text-slate-400 font-medium px-4 py-2 bg-white/5 rounded-xl border border-white/5">
            <span className="text-white font-bold">{filteredCourses.length}</span> courses found
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#1A1F36] border border-white/10 rounded-2xl animate-pulse">
                <div className="h-48 bg-[#232842] rounded-t-2xl"></div>
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-[#232842] rounded w-3/4"></div>
                  <div className="h-4 bg-[#232842] rounded w-1/2"></div>
                  <div className="h-4 bg-[#232842] rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-white mb-2">No courses found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: (index % 6) * 0.08 }}
                whileHover={{ y: -8 }}
                className="group bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all duration-300"
              >
                <Link to={`/courses/${course.id}`} className="block">
                  <div className="relative">
                    {/* Thumbnail: DB pre-computed > YouTube generated > uploaded > placeholder */}
                    {(() => {
                      // Use DB pre-computed thumbnail first (set by Postgres trigger)
                      const dbThumb = course.final_thumbnail_url || course.youtube_thumbnail_url || null;
                      const ytUrl = course.preview_video_url || course.youtube_video_url || null;
                      const ytThumb = dbThumb || getYoutubeThumbnail(ytUrl);
                      const resolvedThumb = ytThumb || course.custom_thumbnail_url || course.thumbnail_url || (course.thumbnail && course.thumbnail !== '' ? course.thumbnail : null) || null;

                      function handleErr(e) {
                        if (ytUrl && e.target.src.includes('maxresdefault')) {
                          const hq = getYoutubeThumbnail(ytUrl, 'hq');
                          if (hq && hq !== e.target.src) { e.target.src = hq; return; }
                        }
                        const fallback = course.thumbnail_url || course.thumbnail;
                        if (fallback && e.target.src !== fallback) { e.target.src = fallback; return; }
                        e.target.style.display = 'none';
                      }

                      return resolvedThumb ? (
                        <img
                          src={resolvedThumb}
                          alt={course.title}
                          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={handleErr}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                          <span className="text-4xl">🎓</span>
                        </div>
                      );
                    })()}

                    {course.is_bestseller && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                          Bestseller
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {course.course_name}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.course_description}
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                      {course.instructor?.image || course.instructor?.avatar_url ? (
                        <img
                          src={course.instructor?.image || course.instructor?.avatar_url}
                          alt={course.instructor?.first_name || 'Instructor'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {course.instructor?.first_name?.charAt(0) || 'I'}
                          </span>
                        </div>
                      )}
                      <span className="text-gray-300 text-sm">
                        {course.instructor?.first_name} {course.instructor?.last_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>{course.average_rating || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{course.enrolled_students_count || 0} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.total_duration || '10h'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div>
                        <span className="text-2xl font-bold text-white">
                          {course.price > 0 ? `₹${course.price}` : <span className="text-emerald-400">FREE</span>}
                        </span>
                        {course.original_price > course.price && (
                          <span className="text-gray-500 line-through ml-2">
                            ₹{course.original_price}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {enrolledCourseIds.has(course.id || course._id) ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/learn/${course.id || course._id}`);
                            }}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg text-center flex items-center justify-center"
                          >
                            Go To Classroom
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to course details or handle enroll
                                navigate(`/courses/${course.id || course._id}`);
                              }}
                              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg"
                            >
                              Enroll Now
                            </button>
                            {token && user?.accountType === 'Student' && (
                              <button
                                onClick={(e) => {
                                  const c = { ...course };
                                  if (!c._id) c._id = c.id;
                                  handleAddToCart(c, e);
                                }}
                                className={`p-2 ${cart.some(item => (item._id || item.id) === (course._id || course.id)) ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-white/10 hover:bg-white/20'} rounded-full transition-colors`}
                              >
                                <ShoppingCart className="h-4 w-4 text-gray-400" />
                              </button>
                            )}
                          </>
                        )}
                        {token && user?.accountType === 'Student' && (
                          <button
                            onClick={(e) => handleToggleWishlist(course, e)}
                            className={`p-2 rounded-full transition-colors ${
                              wishlist.some((item) => item.id === course.id)
                                ? 'bg-pink-500 hover:bg-pink-600'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${wishlist.some((item) => item.id === course.id) ? 'text-white fill-current' : 'text-gray-400'}`} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleShare(course, e)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <Share2 className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Flying Hearts Animation */}
      <AnimatePresence>
        {flyingHearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ x: heart.x, y: heart.y, scale: 1, opacity: 1 }}
            animate={{ 
              x: window.innerWidth > 768 ? window.innerWidth - 200 : window.innerWidth - 60, 
              y: 20,
              scale: 0.2, 
              opacity: 0 
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed z-[9999] pointer-events-none drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
          >
            <Heart className="h-8 w-8 text-pink-500 fill-current" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ExploreCourses;
