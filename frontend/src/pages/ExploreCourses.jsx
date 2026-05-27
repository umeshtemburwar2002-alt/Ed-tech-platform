import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Star, Users, Clock, Tag, Heart, Share2 } from 'lucide-react';
import RatingStars from '../components/common/RatingStars';
import Footer from '../components/common/Footer';
import CourseCard from '../components/common/CourseCard';
import { supabase } from '../config/supabaseClient';

const bgPattern = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
};

const ExploreCourses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [category, setCategory] = useState('all');

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
            price,
            thumbnail,
            tags,
            category_id,
            status,
            created_at,
            sold_count,
            is_free,
            preview_video_url,
            preview_video_id,
            preview_video_thumbnail,
            preview_video_embed_url,
            video_provider,
            preview_duration,
            preview_type,
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
    <div className="min-h-screen bg-[#0B1020]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 py-20">
        <div className="absolute inset-0 opacity-20" style={bgPattern}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-white mb-6">
              Explore Courses
            </h1>
            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Discover courses from top instructors. Learn anything, anywhere.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 bg-[#1A1F36] border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1F36] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          
          <div className="text-gray-400">
            {filteredCourses.length} courses found
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
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group bg-[#1A1F36] border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
              >
                <Link to={`/courses/${course.id}`} className="block">
                  <div className="relative">
                    <img
                      src={course.thumbnail || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop'}
                      alt={course.course_name}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                      >
                        <Heart className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                      >
                        <Share2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
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
                        {course.tags?.slice(0, 1).map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {tag}
                          </span>
                        ))}
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
    </div>
  );
};

export default ExploreCourses;
