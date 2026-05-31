import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaGraduationCap,
  FaPlay,
  FaPause,
  FaCheckCircle,
  FaClock,
  FaCalendar,
  FaStar,
  FaBookmark,
  FaDownload,
  FaFilter,
  FaSearch,
  FaChartLine,
  FaTrophy,
  FaFire,
  FaBook,
  FaVideo,
  FaFileAlt,
  FaQuestionCircle,
  FaEye,
  FaArrowRight,
  FaPlayCircle,
  FaUsers,
  FaLightbulb,
  FaRocket
} from 'react-icons/fa';
import { Card, Button, Badge } from '../../components/ui';
import { supabase } from '../../config/supabaseClient';
import { ActivityTracker } from '../../services/operations/dashboardAPI';
import { toast } from 'react-hot-toast';

const MyLearning = () => {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (user && token) {
      loadMyLearningData();
      
      // Set up real-time refresh
      const interval = setInterval(() => {
        refreshLearningData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const loadMyLearningData = async () => {
    try {
      setLoading(true);
      
      // Get real data from Supabase
      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select(`
          id, enrolled_at, completed, progress, progress_percent, course_id,
          courses (
            id, title, final_thumbnail_url, youtube_thumbnail_url, thumbnail_url, thumbnail,
            instructor:instructor_id(first_name, last_name)
          )
        `)
        .eq("student_id", user.id);

      if (enrollError) throw enrollError;

      const formattedCourses = (enrollments || []).map(e => {
        const c = e.courses || {};
        const inst = c.instructor || {};
        const thumb = c.final_thumbnail_url || c.youtube_thumbnail_url || c.thumbnail_url || c.thumbnail;
        const pct = e.progress_percent ?? e.progress ?? 0;
        return {
          courseId: c.id,
          courseName: c.title || 'Unknown Course',
          thumbnail: thumb || 'https://via.placeholder.com/150',
          instructor: inst ? `${inst.first_name || ''} ${inst.last_name || ''}`.trim() : 'Instructor',
          status: e.completed ? 'completed' : (pct > 0 ? 'in_progress' : 'not_started'),
          category: 'Course',
          completionPercentage: e.completed ? 100 : pct,
          timeSpent: 0,
          lastAccessed: e.enrolled_at,
          enrolledDate: e.enrolled_at,
          totalLessons: 0,
          completedLessons: 0
        };
      });

      setEnrolledCourses(formattedCourses);
      setDashboardStats({
        coursesEnrolled: formattedCourses.length,
        coursesCompleted: formattedCourses.filter(c => c.status === 'completed').length,
        lessonsCompleted: 0,
        totalTimeSpent: 0,
        activeStreak: 0
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load learning data:', error);
      setEnrolledCourses([]);
      setDashboardStats({
        coursesEnrolled: 0,
        lessonsCompleted: 0,
        totalTimeSpent: 0,
        activeStreak: 0,
        coursesCompleted: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshLearningData = async () => {
    setRefreshing(true);
    await loadMyLearningData();
    setRefreshing(false);
  };

  const handleContinueLearning = async (course) => {
    try {
      await ActivityTracker.trackLessonStarted(token, course.courseId, course.nextLesson?.id);
      toast.success(`Continuing ${course.courseName}`);
      // Navigate to course player
    } catch (error) {
      console.error('Failed to track lesson start:', error);
    }
  };

  const handleCourseEnrollment = async (courseId) => {
    try {
      await ActivityTracker.trackCourseEnrollment(token, courseId);
      await refreshLearningData(); // Refresh data after enrollment
      toast.success('Course enrolled successfully!');
    } catch (error) {
      console.error('Failed to track course enrollment:', error);
    }
  };

  // Use only real enrolled courses data - no sample data for new users
  const userCourses = enrolledCourses || [];

  // Filter and sort courses
  const filteredCourses = userCourses.filter(course => {
    const matchesFilter = filterStatus === 'all' || course.status === filterStatus;
    const matchesSearch = course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.lastAccessed) - new Date(a.lastAccessed);
      case 'progress':
        return b.completionPercentage - a.completionPercentage;
      case 'title':
        return a.courseName.localeCompare(b.courseName);
      case 'enrolled':
        return new Date(b.enrolledDate) - new Date(a.enrolledDate);
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'secondary';
      default: return 'secondary';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatTimeSpent = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatLastAccessed = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-richblack-5 text-xl">Loading your learning journey...</div>
        </div>
      </div>
    );
  }

  // Empty state for new users
  if (!loading && userCourses.length === 0) {
    return (
      <div className="min-h-screen bg-richblack-900 text-richblack-5 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <Card className="p-12 bg-gradient-to-br from-richblack-800 to-richblack-900">
              <div className="mb-8">
                <FaRocket className="text-6xl text-blue-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-richblack-5 mb-4">
                  Start Your Learning Journey!
                </h1>
                <p className="text-richblack-300 text-lg mb-8">
                  Welcome to your learning dashboard. Enroll in courses to see your progress here.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-richblack-700 rounded-lg">
                  <FaBook className="text-3xl text-blue-400 mx-auto mb-3" />
                  <h3 className="text-richblack-5 font-semibold mb-2">Browse Courses</h3>
                  <p className="text-richblack-400 text-sm">Explore our vast library of courses</p>
                </div>
                <div className="text-center p-6 bg-richblack-700 rounded-lg">
                  <FaChartLine className="text-3xl text-green-400 mx-auto mb-3" />
                  <h3 className="text-richblack-5 font-semibold mb-2">Track Progress</h3>
                  <p className="text-richblack-400 text-sm">Monitor your learning achievements</p>
                </div>
                <div className="text-center p-6 bg-richblack-700 rounded-lg">
                  <FaTrophy className="text-3xl text-yellow-400 mx-auto mb-3" />
                  <h3 className="text-richblack-5 font-semibold mb-2">Earn Certificates</h3>
                  <p className="text-richblack-400 text-sm">Get certified for your skills</p>
                </div>
              </div>
              
              <Link to="/courses">
                <Button variant="primary" size="large" className="px-8 py-3">
                  <FaPlayCircle className="mr-2" />
                  Explore Courses
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-richblack-900 text-richblack-5 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-richblack-5 mb-2 flex items-center space-x-3">
                <FaGraduationCap className="text-blue-400" />
                <span>My Learning</span>
              </h1>
              <p className="text-richblack-300">
                Continue your learning journey and track your progress.
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="info" size="small">
                  {userCourses.length} Course{userCourses.length !== 1 ? 's' : ''} Enrolled
                </Badge>
                <span className="text-richblack-500 text-sm">
                  Last updated: {formatLastAccessed(lastUpdated)}
                </span>
                {refreshing && (
                  <div className="flex items-center space-x-2 text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm">Updating...</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={refreshLearningData}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <FaArrowRight className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        {dashboardStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <FaBook className="text-blue-400 text-2xl" />
                <Badge variant="info" size="small">Total</Badge>
              </div>
              <h3 className="text-2xl font-bold text-richblack-5 mb-1">
                {dashboardStats.coursesEnrolled || 0}
              </h3>
              <p className="text-richblack-400 text-sm">Enrolled Courses</p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <div className="flex items-center justify-between mb-4">
                <FaCheckCircle className="text-green-400 text-2xl" />
                <Badge variant="success" size="small">Completed</Badge>
              </div>
              <h3 className="text-2xl font-bold text-richblack-5 mb-1">
                {dashboardStats.coursesCompleted || 0}
              </h3>
              <p className="text-richblack-400 text-sm">Completed Courses</p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
              <div className="flex items-center justify-between mb-4">
                <FaFire className="text-orange-400 text-2xl" />
                <Badge variant="warning" size="small">Streak</Badge>
              </div>
              <h3 className="text-2xl font-bold text-richblack-5 mb-1">
                {dashboardStats.activeStreak || 0} days
              </h3>
              <p className="text-richblack-400 text-sm">Learning Streak</p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <FaClock className="text-purple-400 text-2xl" />
                <Badge variant="secondary" size="small">Hours</Badge>
              </div>
              <h3 className="text-2xl font-bold text-richblack-5 mb-1">
                {Math.floor((dashboardStats.totalTimeSpent || 0) / 60)}h
              </h3>
              <p className="text-richblack-400 text-sm">Total Study Time</p>
            </Card>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Courses', count: userCourses.length },
                  { value: 'in_progress', label: 'In Progress', count: userCourses.filter(c => c.status === 'in_progress').length },
                  { value: 'completed', label: 'Completed', count: userCourses.filter(c => c.status === 'completed').length },
                  { value: 'not_started', label: 'Not Started', count: userCourses.filter(c => c.status === 'not_started').length }
                ].map((filterOption) => (
                  <button
                    key={filterOption.value}
                    onClick={() => setFilterStatus(filterOption.value)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                      filterStatus === filterOption.value
                        ? 'bg-blue-400 text-richblack-900'
                        : 'bg-richblack-700 text-richblack-300 hover:bg-richblack-600 hover:text-richblack-5'
                    }`}
                  >
                    <span>{filterOption.label}</span>
                    <Badge 
                      variant={filterStatus === filterOption.value ? 'dark' : 'secondary'} 
                      size="small"
                    >
                      {filterOption.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Search and Sort */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-richblack-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-richblack-700 border border-richblack-600 rounded-lg text-richblack-5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-richblack-700 border border-richblack-600 rounded-lg text-richblack-5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="recent">Recently Accessed</option>
                  <option value="progress">Progress</option>
                  <option value="title">Title</option>
                  <option value="enrolled">Enrollment Date</option>
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {sortedCourses.map((course, index) => (
            <motion.div
              key={course.courseId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:scale-105 transition-all duration-300">
                {/* Course Thumbnail */}
                <div className="relative">
                  <img
                    src={course.thumbnail}
                    alt={course.courseName}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant={getStatusColor(course.status)} size="small">
                      {course.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="dark" size="small">
                      {course.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-richblack-5 mb-2">{course.courseName}</h3>
                    <p className="text-richblack-400 text-sm mb-2">by {course.instructor}</p>
                    <div className="flex items-center space-x-4 text-xs text-richblack-500">
                      <span className="flex items-center space-x-1">
                        <FaStar className="text-yellow-400" />
                        <span>{course.rating}</span>
                      </span>
                      <span>{course.totalLessons} lessons</span>
                      <span>{formatTimeSpent(course.timeSpent)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-richblack-400 mb-2">
                      <span>Progress</span>
                      <span>{course.completionPercentage}% complete</span>
                    </div>
                    <div className="w-full bg-richblack-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(course.completionPercentage)}`}
                        style={{ width: `${course.completionPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-richblack-500 mt-1">
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                      <span>{formatTimeSpent(course.timeSpent)} studied</span>
                    </div>
                  </div>

                  {/* Next Lesson */}
                  {course.nextLesson && course.status !== 'completed' && (
                    <div className="mb-4 p-3 bg-richblack-700 rounded-lg">
                      <p className="text-richblack-300 text-xs mb-1">Next Lesson:</p>
                      <p className="text-richblack-5 text-sm font-medium">{course.nextLesson.title}</p>
                      <p className="text-richblack-400 text-xs">{course.nextLesson.duration} min</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4">
                    <Link to={`/learn/${course.courseId}`} className="w-full">
                      <Button 
                        variant="primary" 
                        size="small" 
                        className="w-full flex items-center justify-center"
                      >
                        <FaPlay className="mr-2" />
                        Go To Classroom
                      </Button>
                    </Link>
                  </div>

                  {/* Last Accessed */}
                  <div className="mt-4 pt-4 border-t border-richblack-700">
                    <p className="text-richblack-500 text-xs flex items-center space-x-1">
                      <FaClock />
                      <span>Last accessed: {formatLastAccessed(course.lastAccessed)}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty Search Results */}
        {sortedCourses.length === 0 && userCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center py-12"
          >
            <Card className="p-12">
              <FaSearch className="text-6xl text-richblack-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-richblack-5 mb-2">
                No courses found
              </h3>
              <p className="text-richblack-400 mb-6">
                Try adjusting your search terms or filters.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyLearning;