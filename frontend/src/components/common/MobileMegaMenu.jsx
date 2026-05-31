import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaCode,
  FaDatabase,
  FaShieldAlt,
  FaCloud,
  FaMobile,
  FaPalette,
  FaFire,
  FaClock,
  FaHeart,
  FaBookOpen,
  FaChevronRight,
  FaChevronDown,
  FaStar,
  FaUsers,
  FaPlay,
  FaTimes
} from 'react-icons/fa';
import { courseCategories } from '../../routes/courseRoutes';

const MobileMegaMenu = ({ isOpen, onClose }) => {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('categories');

  // Category icons mapping
  const categoryIcons = {
    'Programming & Development': FaCode,
    'Data & AI': FaDatabase,
    'Cybersecurity': FaShieldAlt,
    'Cloud & DevOps': FaCloud,
    'Mobile App Development': FaMobile,
    'High Demand Skills': FaPalette
  };

  // Mock data (same as desktop version)
  const mockTrendingCourses = [
    {
      id: 1,
      title: 'Complete Python Bootcamp',
      instructor: 'Dr. Sarah Johnson',
      rating: 4.8,
      students: 15420,
      price: '₹2,999',
      category: 'Programming & Development'
    },
    {
      id: 2,
      title: 'React.js Masterclass',
      instructor: 'Prof. Mike Chen',
      rating: 4.9,
      students: 12350,
      price: '₹3,499',
      category: 'Programming & Development'
    },
    {
      id: 3,
      title: 'Machine Learning Fundamentals',
      instructor: 'Dr. Emily Rodriguez',
      rating: 4.7,
      students: 8900,
      price: '₹4,199',
      category: 'Data & AI'
    }
  ];

  const mockMyCourses = user ? [
    {
      id: 1,
      title: 'Python for Beginners',
      progress: 85,
      nextLesson: 'Functions and Modules'
    },
    {
      id: 2,
      title: 'React Development',
      progress: 60,
      nextLesson: 'State Management'
    }
  ] : [];

  // Handle course click
  const handleCourseClick = (courseId, coursePath = null) => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    
    if (coursePath) {
      navigate(coursePath);
    } else {
      navigate(`/courses/${courseId}`);
    }
    onClose();
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    navigate(`/course-catalog?category=${encodeURIComponent(category)}`);
    onClose();
  };

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Filter courses based on search
  const filteredCourses = searchTerm ? 
    mockTrendingCourses.filter(course => 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

  const sidebarVariants = {
    hidden: {
      x: '-100%',
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    visible: {
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };

  const overlayVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 bg-black bg-opacity-50 z-[999] md:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed left-0 top-0 h-full w-80 bg-richblack-800 border-r border-richblack-700 z-[1000] md:hidden overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-richblack-700">
              <h2 className="text-lg font-semibold text-richblack-5">All Courses</h2>
              <button
                onClick={onClose}
                className="p-2 text-richblack-400 hover:text-richblack-200 transition-colors"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-richblack-700">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-richblack-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-richblack-700 border border-richblack-600 rounded-lg text-richblack-5 placeholder-richblack-400 focus:outline-none focus:border-yellow-50 text-sm"
                />
              </div>
              
              {/* Search Results */}
              {searchTerm && (
                <div className="mt-3 bg-richblack-700 rounded-lg border border-richblack-600 max-h-40 overflow-y-auto">
                  {filteredCourses.length > 0 ? (
                    <div className="p-2">
                      {filteredCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => handleCourseClick(course.id)}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-richblack-600 cursor-pointer"
                        >
                          <div className="w-8 h-8 bg-richblack-600 rounded flex items-center justify-center">
                            <FaPlay className="text-richblack-400 text-xs" />
                          </div>
                          <div className="flex-1">
                            <h5 className="text-xs font-medium text-richblack-5">{course.title}</h5>
                            <p className="text-xs text-richblack-400">{course.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-richblack-400 text-xs">
                      No courses found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-richblack-700">
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'categories'
                    ? 'text-yellow-50 border-b-2 border-yellow-50'
                    : 'text-richblack-400 hover:text-richblack-300'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'trending'
                    ? 'text-yellow-50 border-b-2 border-yellow-50'
                    : 'text-richblack-400 hover:text-richblack-300'
                }`}
              >
                Trending
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('my-courses')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === 'my-courses'
                      ? 'text-yellow-50 border-b-2 border-yellow-50'
                      : 'text-richblack-400 hover:text-richblack-300'
                  }`}
                >
                  My Courses
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'categories' && (
                <div className="space-y-3">
                  {Object.entries(courseCategories).map(([category, courses]) => {
                    const IconComponent = categoryIcons[category] || FaCode;
                    const isExpanded = expandedCategory === category;
                    
                    return (
                      <motion.div key={category} variants={itemVariants}>
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-3 bg-richblack-700 rounded-lg border border-richblack-600 hover:border-yellow-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <IconComponent className="text-yellow-50 text-lg" />
                            <div className="text-left">
                              <h4 className="font-medium text-richblack-5 text-sm">{category}</h4>
                              <p className="text-xs text-richblack-400">{courses.length} courses</p>
                            </div>
                          </div>
                          <FaChevronDown className={`text-richblack-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-2 ml-4 space-y-2 overflow-hidden"
                            >
                              {courses.slice(0, 5).map((course, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleCourseClick(course.id, course.path)}
                                  className="w-full text-left p-2 text-sm text-richblack-300 hover:text-yellow-50 hover:bg-richblack-600 rounded transition-colors"
                                >
                                  {course.title}
                                </button>
                              ))}
                              <button
                                onClick={() => handleCategoryClick(category)}
                                className="w-full text-left p-2 text-sm text-yellow-50 hover:text-yellow-100 transition-colors flex items-center"
                              >
                                View All {courses.length} Courses
                                <FaChevronRight className="ml-1 text-xs" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'trending' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-richblack-5 flex items-center">
                    <FaFire className="mr-2 text-orange-500" />
                    Trending Courses
                  </h3>
                  {mockTrendingCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      variants={itemVariants}
                      onClick={() => handleCourseClick(course.id)}
                      className="flex items-center space-x-3 p-3 bg-richblack-700 rounded-lg border border-richblack-600 hover:border-yellow-50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-richblack-600 rounded-lg flex items-center justify-center">
                        <FaPlay className="text-richblack-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-richblack-5 text-sm">{course.title}</h4>
                        <p className="text-xs text-richblack-400">{course.instructor}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1">
                            <FaStar className="text-yellow-400 text-xs" />
                            <span className="text-xs text-richblack-400">{course.rating}</span>
                          </div>
                          <span className="text-xs font-semibold text-yellow-50">{course.price}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {activeTab === 'my-courses' && user && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-richblack-5 flex items-center">
                    <FaBookOpen className="mr-2 text-green-500" />
                    My Courses
                  </h3>
                  {mockMyCourses.length > 0 ? (
                    mockMyCourses.map((course) => (
                      <motion.div
                        key={course.id}
                        variants={itemVariants}
                        onClick={() => handleCourseClick(course.id)}
                        className="p-3 bg-richblack-700 rounded-lg border border-richblack-600 hover:border-green-500 cursor-pointer transition-colors"
                      >
                        <h4 className="font-medium text-richblack-5 text-sm mb-1">{course.title}</h4>
                        <p className="text-xs text-richblack-400 mb-2">Next: {course.nextLesson}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-3">
                            <div className="w-full h-2 bg-richblack-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${course.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs text-richblack-400">{course.progress}%</span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-richblack-400 mb-3">No enrolled courses yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'my-courses' && !user && (
                <div className="text-center py-6">
                  <h3 className="text-sm font-semibold text-richblack-5 mb-2">Login Required</h3>
                  <p className="text-xs text-richblack-400 mb-4">
                    Sign in to view your enrolled courses
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-richblack-700 mt-auto">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    navigate('/course-catalog');
                    onClose();
                  }}
                  className="w-full py-2 bg-yellow-50 text-richblack-900 rounded-lg text-sm font-semibold hover:bg-yellow-100 transition-colors"
                >
                  View All Courses
                </button>
                <button
                  onClick={() => {
                    navigate('/all-courses');
                    onClose();
                  }}
                  className="w-full py-2 bg-richblack-700 text-richblack-300 border border-richblack-600 rounded-lg text-sm hover:bg-richblack-600 transition-colors"
                >
                  Browse by Category
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMegaMenu;