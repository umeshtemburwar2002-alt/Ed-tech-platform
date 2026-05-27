import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useRealtime } from "../../hooks/useRealtime";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useCourses } from "../../hooks/useCourses";
import { FaDownload, FaFilter, FaUsers, FaEye, FaClock, FaCheckCircle, FaPlay, FaShoppingCart, FaStar, FaTrendingUp, FaTrendingDown, FaCalendar } from "react-icons/fa";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const Analytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  
  const [dateRange, setDateRange] = useState("30d"); // 7d, 30d, 90d, 1y
  const [selectedCourse, setSelectedCourse] = useState(courseId || "");
  const [courses, setCourses] = useState([]);
  const [realtimeData, setRealtimeData] = useState(null);
  const [analytics, setAnalytics] = useState({
    overview: {
      totalEnrollments: 0,
      activeStudents: 0,
      completionRate: 0,
      avgRating: 0,
      totalRevenue: 0,
      totalWatchTime: 0,
    },
    enrollmentsTrend: [],
    completionRates: [],
    demographic: [],
    revenueData: [],
    lessonPerformance: [],
    quizPerformance: [],
    topCourses: [],
  });

  const { fetchCourseAnalytics, fetchInstructorAnalytics, loading } = useAnalytics();
  const { fetchInstructorCourses } = useCourses();
  const { subscribeToChannel, unsubscribeFromChannel } = useRealtime();

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const courses = await fetchInstructorCourses(user?.id);
      setCourses(courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, [user?.id, fetchInstructorCourses]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    let data;
    if (selectedCourse) {
      data = await fetchCourseAnalytics(selectedCourse, dateRange);
    } else {
      data = await fetchInstructorAnalytics(user?.id, dateRange);
    }
    
    if (data) {
      setAnalytics(data);
    }
  }, [selectedCourse, dateRange, user?.id, fetchCourseAnalytics, fetchInstructorAnalytics]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Realtime subscription
  useEffect(() => {
    if (selectedCourse) {
      const channel = subscribeToChannel(
        `analytics:${selectedCourse}`,
        { event: "analytics_update" },
        (payload) => {
          setRealtimeData(payload);
        }
      );

      return () => unsubscribeFromChannel(channel);
    }
  }, [selectedCourse, subscribeToChannel, unsubscribeFromChannel]);

  // Export to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => JSON.stringify(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully");
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get trend icon
  const getTrendIcon = (current, previous) => {
    if (!previous) return null;
    const trend = ((current - previous) / previous) * 100;
    if (trend > 0) return <FaTrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <FaTrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  // Get trend color
  const getTrendColor = (current, previous) => {
    if (!previous) return "text-gray-500";
    const trend = ((current - previous) / previous) * 100;
    return trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Course Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your course performance and student engagement
            </p>
          </div>
          <button
            onClick={() => navigate("/instructor/courses")}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Courses
          </button>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md mb-6"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            {/* Course Selector */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            {/* Export Button */}
            <button
              onClick={() => exportToCSV(analytics.enrollmentsTrend, "analytics")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaDownload /> Export
            </button>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"
        >
          {[
            {
              label: "Total Enrollments",
              value: analytics.overview.totalEnrollments,
              icon: FaUsers,
              color: "blue",
              previous: analytics.overview.previousEnrollments,
            },
            {
              label: "Active Students",
              value: analytics.overview.activeStudents,
              icon: FaPlay,
              color: "green",
              previous: analytics.overview.previousActive,
            },
            {
              label: "Completion Rate",
              value: `${analytics.overview.completionRate.toFixed(1)}%`,
              icon: FaCheckCircle,
              color: "purple",
              previous: analytics.overview.previousCompletion,
            },
            {
              label: "Average Rating",
              value: analytics.overview.avgRating.toFixed(1),
              icon: FaStar,
              color: "yellow",
              previous: analytics.overview.previousRating,
            },
            {
              label: "Total Revenue",
              value: formatCurrency(analytics.overview.totalRevenue),
              icon: FaShoppingCart,
              color: "emerald",
              previous: analytics.overview.previousRevenue,
            },
            {
              label: "Watch Time",
              value: formatTime(analytics.overview.totalWatchTime),
              icon: FaEye,
              color: "indigo",
              previous: analytics.overview.previousWatchTime,
            },
          ].map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(card.value, card.previous)}
                  <span
                    className={`text-sm ${getTrendColor(card.value, card.previous)}`}
                  >
                    {card.previous && `(${(((card.value - card.previous) / card.previous) * 100).toFixed(1)}%)`}
                  </span>
                  <div className={`p-3 rounded-lg bg-${card.color}-100 text-${card.color}-600`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Charts Section (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Enrollments Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Enrollments Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.enrollmentsTrend}>
                  <defs>
                    <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorEnrollments)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Completion Rates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Lesson Completion Rates
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.completionRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="lesson" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="completion" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Revenue Data */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Metrics Section (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Demographic Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Student Demographics
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.demographic}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.demographic.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Lesson Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Lessons
              </h3>
              <div className="space-y-3">
                {analytics.lessonPerformance.slice(0, 5).map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {lesson.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(lesson.watchTime)} watched
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {lesson.completionRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quiz Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quiz Performance
              </h3>
              <div className="space-y-3">
                {analytics.quizPerformance.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {quiz.attempts} attempts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {quiz.avgScore.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        avg score
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top Courses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Courses
              </h3>
              <div className="space-y-3">
                {analytics.topCourses.slice(0, 5).map((course, index) => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {course.enrollments} students
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(course.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Realtime indicator */}
            {realtimeData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Realtime: New enrollment detected
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;