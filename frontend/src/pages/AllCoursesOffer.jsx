import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { addToWishlist, removeFromWishlist } from '../services/operations/wishlistAPI';
import {
  FaStar,
  FaUsers,
  FaClock,
  FaPlay,
  FaBookmark,
  FaFilter,
  FaSearch,
  FaArrowLeft,
  FaRocket,
  FaFire,
  FaCheckCircle,
  FaGraduationCap,
  FaHeart,
  FaShare,
  FaEye,
  FaBalanceScale,
  FaQuoteLeft,
  FaThumbsUp,
  FaVideo,
  FaShoppingCart,
  FaTimes,
  FaExpand
} from 'react-icons/fa';
import Footer from '../components/common/Footer';
import { courses } from '../data/courses';

const AllCoursesOffer = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [sortBy, setSortBy] = useState('popularity');
  const [filteredCourses, setFilteredCourses] = useState([]);
  
  const dispatch = useDispatch();
  const { wishlist } = useSelector((state) => state.wishlist);
  const { token } = useSelector((state) => state.auth);

  const [compareList, setCompareList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [selectedInstructor, setSelectedInstructor] = useState('All');
  const [showPreview, setShowPreview] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const categories = ['All', 'Programming & Development', 'Data & AI', 'Cloud & DevOps', 'Cybersecurity', 'Mobile Development', 'Design', 'Development Tools'];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const instructors = ['All', ...new Set(courses.map(course => course.instructor))];

  // Utility functions
  const handleToggleWishlist = (course) => {
    if (!token) {
      toast.error('Please log in to add to wishlist');
      return;
    }
    const isWishlisted = wishlist.some((item) => item.id === course.id);
    if (isWishlisted) {
      dispatch(removeFromWishlist(course.id, token));
    } else {
      dispatch(addToWishlist(course.id, course, token));
    }
  };

  const toggleCompare = (courseId) => {
    setCompareList(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else if (prev.length < 3) {
        return [...prev, courseId];
      } else {
        alert('You can compare maximum 3 courses at a time');
        return prev;
      }
    });
  };

  const shareCourse = (course) => {
    if (navigator.share) {
      navigator.share({
        title: course.title,
        text: course.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Course link copied to clipboard!');
    }
  };

  // Filter and sort courses
  useEffect(() => {
    let filtered = courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === 'All' || course.level === selectedLevel;
      const matchesPrice = course.salePrice >= priceRange[0] && course.salePrice <= priceRange[1];
      const matchesInstructor = selectedInstructor === 'All' || course.instructor === selectedInstructor;
      
      return matchesSearch && matchesCategory && matchesLevel && matchesPrice && matchesInstructor;
    });

    // Sort courses
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.salePrice - b.salePrice;
        case 'price-high':
          return b.salePrice - a.salePrice;
        case 'rating':
          return b.rating - a.rating;
        case 'students':
          return b.students - a.students;
        default: // popularity
          return b.students - a.students;
      }
    });

    setFilteredCourses(filtered);
  }, [searchTerm, selectedCategory, selectedLevel, sortBy, priceRange, selectedInstructor]);

  const handleEnrollNow = (course) => {
    // Navigate to generic course details page with the course ID
    navigate(`/courses/${course.id}`);
  };

  return (
    <div className="min-h-screen bg-richblack-900 text-richblack-5">
      {/* Header */}
      <div className="bg-richblack-800 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/offers" 
              className="flex items-center gap-2 text-richblack-300 hover:text-white transition-colors duration-300"
            >
              <FaArrowLeft />
              <span>Back to Offers</span>
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                <FaFire className="text-orange-400" />
                All Courses - Special Offer
                <FaFire className="text-orange-400" />
              </h1>
              <p className="text-richblack-300 mt-2">70% OFF on all courses - Limited time offer!</p>
            </div>
            <div className="w-32"></div>
          </div>

          {/* Special Offer Banner */}
          <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 rounded-2xl p-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">🔥 FLASH SALE - 70% OFF ALL COURSES!</h2>
            <p className="text-lg">Limited time offer - Don't miss out on this amazing deal!</p>
          </div>
        </div>
      </div>

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Enhanced Filters */}
          <div className="bg-richblack-800 rounded-xl p-6 mb-8">
            {/* Top Row - Main Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-richblack-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-richblack-700 border border-richblack-600 rounded-lg text-white placeholder-richblack-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-3 px-4 bg-richblack-700 border border-richblack-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Level Filter */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full py-3 px-4 bg-richblack-700 border border-richblack-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-3 px-4 bg-richblack-700 border border-richblack-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="popularity">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="students">Most Students</option>
              </select>
            </div>

            {/* Bottom Row - Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-richblack-600">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-richblack-300 mb-2">
                  Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full h-2 bg-richblack-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Instructor Filter */}
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="py-3 px-4 bg-richblack-700 border border-richblack-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {instructors.map(instructor => (
                  <option key={instructor} value={instructor}>{instructor}</option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-richblack-700 text-richblack-300 hover:bg-richblack-600'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-richblack-700 text-richblack-300 hover:bg-richblack-600'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Results Count & Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <p className="text-richblack-300">
              Showing {filteredCourses.length} of {courses.length} courses
            </p>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              {/* Wishlist Count */}
              {wishlist.length > 0 && (
                <div className="flex items-center gap-2 text-pink-400">
                  <FaHeart />
                  <span>{wishlist.length} in wishlist</span>
                </div>
              )}
              
              {/* Compare Button */}
              {compareList.length > 0 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaBalanceScale />
                  <span>Compare ({compareList.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-richblack-800 rounded-xl overflow-hidden border border-richblack-700 hover:border-purple-500 transition-all duration-300 group hover:scale-105"
              >
                {/* Course Image/Icon */}
                <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-center group">
                  <div className="text-6xl mb-4">{course.image}</div>
                  
                  {/* Discount Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {course.discount}% OFF
                    </span>
                  </div>
                  
                  {/* Level Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      course.level === 'Beginner' ? 'bg-green-500 text-white' :
                      course.level === 'Intermediate' ? 'bg-yellow-500 text-black' :
                      'bg-red-500 text-white'
                    }`}>
                      {course.level}
                    </span>
                  </div>
                  
                  {/* Action Buttons - Show on Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    {/* Preview Button */}
                    <button
                      onClick={() => setShowPreview(course.id)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                      title="Preview Course"
                    >
                      <FaVideo />
                    </button>
                    
                    {/* Wishlist Button */}
                    <button
                      onClick={() => handleToggleWishlist(course)}
                      className={`p-2 backdrop-blur-sm rounded-full transition-colors ${
                        wishlist.some(item => item.id === course.id)
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                      title="Add to Wishlist"
                    >
                      <FaHeart />
                    </button>
                    
                    {/* Compare Button */}
                    <button
                      onClick={() => toggleCompare(course.id)}
                      className={`p-2 backdrop-blur-sm rounded-full transition-colors ${
                        compareList.includes(course.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                      title="Add to Compare"
                    >
                      <FaBalanceScale />
                    </button>
                    
                    {/* Share Button */}
                    <button
                      onClick={() => shareCourse(course)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                      title="Share Course"
                    >
                      <FaShare />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Course Title */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-300">
                    {course.title}
                  </h3>

                  {/* Instructor */}
                  <p className="text-richblack-300 text-sm mb-3">by {course.instructor}</p>

                  {/* Rating and Students */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className="w-3 h-3" />
                        ))}
                      </div>
                      <span className="text-sm text-richblack-300 ml-1">({course.rating})</span>
                    </div>
                    <div className="flex items-center gap-1 text-richblack-400 text-sm">
                      <FaUsers className="w-3 h-3" />
                      <span>{course.students.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1 text-richblack-400 text-sm mb-4">
                    <FaClock className="w-3 h-3" />
                    <span>{course.duration}</span>
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-1">
                      {course.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <FaCheckCircle className="text-green-400 w-3 h-3 flex-shrink-0" />
                          <span className="text-xs text-richblack-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold text-white">₹{course.salePrice.toLocaleString()}</span>
                    <span className="text-sm text-richblack-400 line-through">₹{course.originalPrice.toLocaleString()}</span>
                  </div>

                  {/* Enroll Button */}
                  <button
                    onClick={() => handleEnrollNow(course)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform group-hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FaRocket />
                    <span>Enroll Now</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* No Results */}
          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-2">No courses found</h3>
              <p className="text-richblack-400">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-16 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">🚀 Ready to Start Learning?</h2>
            <p className="text-lg mb-6">Join thousands of students and transform your career today!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup"
                className="bg-white text-purple-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
              >
                <FaGraduationCap className="inline mr-2" />
                Start Learning Today
              </Link>
              <Link 
                to="/offers"
                className="border-2 border-white text-white font-bold py-3 px-8 rounded-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                View All Offers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Course Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-richblack-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {courses.find(c => c.id === showPreview)?.title} - Preview
                </h3>
                <button
                  onClick={() => setShowPreview(null)}
                  className="text-richblack-400 hover:text-white transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
              
              {/* Video Preview */}
              <div className="bg-richblack-700 rounded-lg p-8 text-center mb-6">
                <FaPlay className="text-6xl text-purple-400 mx-auto mb-4" />
                <p className="text-richblack-300">Course Preview Video</p>
                <p className="text-sm text-richblack-400 mt-2">
                  Get a glimpse of what you'll learn in this course
                </p>
              </div>
              
              {/* Course Details */}
              {(() => {
                const course = courses.find(c => c.id === showPreview);
                return course ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">What You'll Learn</h4>
                      <ul className="space-y-2">
                        {course.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-richblack-300">
                            <FaCheckCircle className="text-green-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">Course Info</h4>
                      <div className="space-y-3 text-richblack-300">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-blue-400" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaUsers className="text-green-400" />
                          <span>{course.students.toLocaleString()} students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaStar className="text-yellow-400" />
                          <span>{course.rating} rating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaGraduationCap className="text-purple-400" />
                          <span>{course.level} level</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Action Buttons */}
              <div className="flex gap-4 mt-6 pt-6 border-t border-richblack-600">
                <button
                  onClick={() => {
                    const course = courses.find(c => c.id === showPreview);
                    if (course) handleEnrollNow(course);
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  Enroll Now
                </button>
                <button
                  onClick={() => setShowPreview(null)}
                  className="px-6 py-3 border border-richblack-600 text-richblack-300 rounded-lg hover:bg-richblack-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Comparison Modal */}
      {showComparison && compareList.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-richblack-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Compare Courses</h3>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-richblack-400 hover:text-white transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {compareList.map(courseId => {
                  const course = courses.find(c => c.id === courseId);
                  return course ? (
                    <div key={courseId} className="bg-richblack-700 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">{course.image}</div>
                        <h4 className="font-bold text-white">{course.title}</h4>
                        <p className="text-richblack-400 text-sm">{course.instructor}</p>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-richblack-400">Price:</span>
                          <span className="text-white font-bold">₹{course.salePrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-richblack-400">Duration:</span>
                          <span className="text-white">{course.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-richblack-400">Level:</span>
                          <span className="text-white">{course.level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-richblack-400">Rating:</span>
                          <span className="text-white">{course.rating}⭐</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-richblack-400">Students:</span>
                          <span className="text-white">{course.students.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleEnrollNow(course)}
                        className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Enroll Now
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AllCoursesOffer;