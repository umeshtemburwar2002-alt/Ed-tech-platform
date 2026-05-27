import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useCourses } from "../hooks/useCourses";
import { useRealtime } from "../hooks/useRealtime";
import useCourseStore from "../stores/courseStore";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaChartLine,
  FaSearch,
  FaPlus,
  FaStar,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaBookOpen,
} from "react-icons/fa";

const MyCourses = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  const { fetchInstructorCourses, deleteCourse, duplicateCourse, publishCourse } = useCourses();
  const { subscribeToEnrollments } = useRealtime();
  
  const { courses, setCourses, filters, setFilters, updateCourseInList, removeCourseFromList, addCourseToList } = useCourseStore();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    students: 0,
    avgRating: 0,
  });

  // Calculate stats
  useEffect(() => {
    const calculateStats = () => {
      setStats({
        total: courses.length,
        published: courses.filter((c) => c.status === "published").length,
        students: courses.reduce((sum, c) => sum + (c.enrolled_students_count || 0), 0),
        avgRating: courses.length > 0 
          ? (courses.reduce((sum, c) => sum + (c.average_rating || 0), 0) / courses.length).toFixed(1)
          : 0,
      });
    };
    calculateStats();
  }, [courses]);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await fetchInstructorCourses(user.id);
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchInstructorCourses, setCourses]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Realtime enrollment updates
  useEffect(() => {
    if (!user?.id) return;
    
    const cleanup = subscribeToEnrollments(user.id, (payload) => {
      if (payload.eventType === "INSERT") {
        // Update course student count
        const courseId = payload.new.course_id;
        setCourses((prev) =>
          prev.map((course) =>
            course.id === courseId
              ? { ...course, enrolled_students_count: (course.enrolled_students_count || 0) + 1 }
              : course
          )
        );
      }
    });

    return cleanup;
  }, [user?.id, subscribeToEnrollments, setCourses]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  // Filter and sort courses
  const filteredAndSortedCourses = courses
    .filter((course) => {
      const matchesStatus = filters.status === "all" || course.status === filters.status;
      const matchesSearch = filters.search === "" || 
        course.title?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      switch (filters.sort) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "mostStudents":
          return (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0);
        case "highestRated":
          return (b.average_rating || 0) - (a.average_rating || 0);
        default:
          return 0;
      }
    });

  const handleDelete = async () => {
    if (!deletingCourse) return;
    
    try {
      const { error } = await deleteCourse(deletingCourse.id);
      if (error) throw error;
      
      removeCourseFromList(deletingCourse.id);
      toast.success("Course deleted successfully");
      setShowDeleteModal(false);
      setDeletingCourse(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const handleDuplicate = async (courseId) => {
    try {
      const { data, error } = await duplicateCourse(courseId);
      if (error) throw error;
      
      addCourseToList(data);
      toast.success("Course duplicated successfully");
    } catch (error) {
      console.error("Error duplicating course:", error);
      toast.error("Failed to duplicate course");
    }
  };

  const handlePublish = async (courseId) => {
    try {
      const { error } = await publishCourse(courseId);
      if (error) throw error;
      
      updateCourseInList({ id: courseId, status: "pending" });
      toast.success("Course submitted for review");
    } catch (error) {
      console.error("Error publishing course:", error);
      toast.error("Failed to publish course");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "published":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "archived":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`}
        />
      );
    }
    return stars;
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and monitor your courses
          </p>
        </div>
        <button
          onClick={() => navigate("/instructor/courses/new")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaPlus className="w-5 h-5" />
          Create Course
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={FaBookOpen}
          title="Total Courses"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={FaCheckCircle}
          title="Published"
          value={stats.published}
          color="green"
        />
        <StatCard
          icon={FaUsers}
          title="Total Students"
          value={stats.students}
          color="purple"
        />
        <StatCard
          icon={FaStar}
          title="Avg Rating"
          value={stats.avgRating}
          color="yellow"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "draft", "pending", "published", "rejected", "archived"].map((status) => (
            <button
              key={status}
              onClick={() => setFilters({ status })}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filters.status === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="mostStudents">Most Students</option>
          <option value="highestRated">Highest Rated</option>
        </select>
      </div>

      {/* Course Grid */}
      {filteredAndSortedCourses.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <FaBookOpen className="w-24 h-24 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No courses yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first course to get started
          </p>
          <button
            onClick={() => navigate("/instructor/courses/new")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAndSortedCourses.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <FaBookOpen className="w-16 h-16 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(course.status)}`}>
                      {course.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  
                  {course.subject_code && course.semester && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {course.subject_code} - Sem {course.semester}
                      </span>
                    </div>
                  )}

                  {course.departments && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {course.departments.name}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FaUsers className="w-4 h-4" />
                      {course.enrolled_students_count || 0} students
                    </span>
                    <span className="flex items-center gap-1">
                      {renderStars(course.average_rating || 0)}
                      <span className="text-xs">({course.total_reviews || 0})</span>
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-3">
                    {course.is_free ? (
                      <span className="text-green-600 font-semibold">Free</span>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ₹{course.discounted_price || course.price || 0}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <FaEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/instructor/courses/${course.id}/builder`)}
                      className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <FaBookOpen className="w-4 h-4" />
                      Builder
                    </button>
                    <button
                      onClick={() => handleDuplicate(course.id)}
                      className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <FaCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCourse(course); setShowDeleteModal(true)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePublish(course.id)}
                      className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <FaCheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/instructor/courses/${course.id}/analytics`)}
                      className="px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <FaChartLine className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Delete Course
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{deletingCourse?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default MyCourses;