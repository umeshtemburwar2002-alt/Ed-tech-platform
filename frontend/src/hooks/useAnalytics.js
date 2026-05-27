import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

/**
 * Hook for fetching and managing course analytics data
 * Provides enrollment trends, completion rates, revenue data, demographic info, and more
 */
export const useAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch comprehensive analytics for a course
   * @param {string} courseId - Course ID
   * @param {string} dateRange - Date range: 7d, 30d, 90d, 1y
   * @returns {Object} Analytics data
   */
  const fetchCourseAnalytics = useCallback(async (courseId, dateRange = "30d") => {
    if (!courseId) {
      setError("Course ID is required");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Fetch overview metrics
      const { data: enrollments, error: enrollmentsError } = await fetch(
        `/api/enrollments?course_id=${courseId}&start_date=${startDate.toISOString()}&end_date=${now.toISOString()}`
      );

      if (enrollmentsError) throw enrollmentsError;

      // Fetch lesson progress
      const { data: lessonProgress, error: progressError } = await fetch(
        `/api/lesson-progress?course_id=${courseId}&start_date=${startDate.toISOString()}&end_date=${now.toISOString()}`
      );

      if (progressError) throw progressError;

      // Fetch quiz attempts
      const { data: quizAttempts, error: quizError } = await fetch(
        `/api/quiz-attempts?course_id=${courseId}&start_date=${startDate.toISOString()}&end_date=${now.toISOString()}`
      );

      if (quizError) throw quizError;

      // Fetch revenue data
      const { data: payments, error: paymentsError } = await fetch(
        `/api/payments?course_id=${courseId}&start_date=${startDate.toISOString()}&end_date=${now.toISOString()}`
      );

      if (paymentsError) throw paymentsError;

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await fetch(
        `/api/reviews?course_id=${courseId}`
      );

      if (reviewsError) throw reviewsError;

      // Calculate overview metrics
      const totalEnrollments = enrollments?.length || 0;
      const activeStudents = enrollments?.filter(e => e.last_activity_at && 
        new Date(e.last_activity_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0;
      
      const completedLessons = lessonProgress?.filter(lp => lp.completed_at).length || 0;
      const totalLessons = lessonProgress?.length || 0;
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      const avgRating = reviews?.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalWatchTime = lessonProgress?.reduce((sum, lp) => sum + (lp.watch_time || 0), 0) || 0;

      // Generate enrollment trend data
      const enrollmentsTrend = generateTrendData(enrollments || [], dateRange, "created_at");
      
      // Generate revenue trend data
      const revenueData = generateTrendData(payments || [], dateRange, "created_at", "amount");

      // Calculate completion rates by lesson
      const completionRates = calculateCompletionRates(lessonProgress || []);

      // Generate demographic data
      const demographic = generateDemographicData(enrollments || []);

      // Calculate lesson performance
      const lessonPerformance = calculateLessonPerformance(lessonProgress || []);

      // Calculate quiz performance
      const quizPerformance = calculateQuizPerformance(quizAttempts || []);

      // Calculate top courses (if courseId is null, fetch all courses for instructor)
      const topCourses = courseId 
        ? null 
        : await fetchTopCourses(user?.id);

      return {
        overview: {
          totalEnrollments,
          activeStudents,
          completionRate,
          avgRating,
          totalRevenue,
          totalWatchTime,
        },
        enrollmentsTrend,
        completionRates,
        demographic,
        revenueData,
        lessonPerformance,
        quizPerformance,
        topCourses: topCourses || [],
      };
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Fetch analytics for all courses of an instructor
   * @param {string} instructorId - Instructor ID
   * @param {string} dateRange - Date range
   * @returns {Object} Aggregated analytics data
   */
  const fetchInstructorAnalytics = useCallback(async (instructorId, dateRange = "30d") => {
    if (!instructorId) {
      setError("Instructor ID is required");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all courses for instructor
      const { data: courses, error: coursesError } = await fetch(
        `/api/courses?instructor_id=${instructorId}`
      );

      if (coursesError) throw coursesError;

      // Fetch analytics for each course
      const courseAnalytics = await Promise.all(
        (courses || []).map(course => fetchCourseAnalytics(course.id, dateRange))
      );

      // Aggregate data
      const aggregated = courseAnalytics.reduce((acc, analytics) => {
        if (!analytics) return acc;
        
        return {
          overview: {
            totalEnrollments: acc.overview.totalEnrollments + analytics.overview.totalEnrollments,
            activeStudents: acc.overview.activeStudents + analytics.overview.activeStudents,
            completionRate: acc.overview.completionRate + analytics.overview.completionRate,
            avgRating: acc.overview.avgRating + analytics.overview.avgRating,
            totalRevenue: acc.overview.totalRevenue + analytics.overview.totalRevenue,
            totalWatchTime: acc.overview.totalWatchTime + analytics.overview.totalWatchTime,
          },
          enrollmentsTrend: aggregateTrendData(acc.enrollmentsTrend, analytics.enrollmentsTrend),
          revenueData: aggregateTrendData(acc.revenueData, analytics.revenueData),
          topCourses: [...acc.topCourses, ...analytics.topCourses],
        };
      }, {
        overview: { totalEnrollments: 0, activeStudents: 0, completionRate: 0, avgRating: 0, totalRevenue: 0, totalWatchTime: 0 },
        enrollmentsTrend: [],
        revenueData: [],
        topCourses: [],
      });

      // Calculate averages
      const courseCount = courses?.length || 1;
      aggregated.overview.completionRate /= courseCount;
      aggregated.overview.avgRating /= courseCount;

      // Sort top courses
      aggregated.topCourses.sort((a, b) => b.enrollments - a.enrollments);

      return aggregated;
    } catch (err) {
      console.error("Error fetching instructor analytics:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate trend data for charts
   */
  const generateTrendData = (data, dateRange, dateField, valueField = "count") => {
    const trend = [];
    const now = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Group by day
    const grouped = {};
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    data.forEach(item => {
      const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
      if (grouped.hasOwnProperty(itemDate)) {
        grouped[itemDate] += valueField === "count" ? 1 : (item[valueField] || 0);
      }
    });

    // Convert to array
    Object.entries(grouped).forEach(([date, value]) => {
      trend.push({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        [valueField]: value,
      });
    });

    return trend;
  };

  /**
   * Aggregate multiple trend datasets
   */
  const aggregateTrendData = (data1, data2) => {
    const aggregated = [...data1];
    
    data2.forEach(item => {
      const existing = aggregated.find(d => d.date === item.date);
      if (existing) {
        Object.keys(item).forEach(key => {
          if (key !== 'date') {
            existing[key] = (existing[key] || 0) + (item[key] || 0);
          }
        });
      } else {
        aggregated.push({ ...item });
      }
    });

    return aggregated.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  /**
   * Calculate completion rates by lesson
   */
  const calculateCompletionRates = (lessonProgress) => {
    const lessonStats = {};

    lessonProgress.forEach(lp => {
      if (!lessonStats[lp.lesson_id]) {
        lessonStats[lp.lesson_id] = {
          lesson_id: lp.lesson_id,
          lesson: lp.lesson_title || "Unknown",
          total: 0,
          completed: 0,
        };
      }
      lessonStats[lp.lesson_id].total++;
      if (lp.completed_at) {
        lessonStats[lp.lesson_id].completed++;
      }
    });

    return Object.values(lessonStats).map(stat => ({
      lesson: stat.lesson,
      completion: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
    }));
  };

  /**
   * Generate demographic data
   */
  const generateDemographicData = (enrollments) => {
    const demographic = {};

    enrollments.forEach(e => {
      const location = e.location || "Unknown";
      demographic[location] = (demographic[location] || 0) + 1;
    });

    return Object.entries(demographic).map(([name, value]) => ({
      name,
      value,
    }));
  };

  /**
   * Calculate lesson performance
   */
  const calculateLessonPerformance = (lessonProgress) => {
    const lessonStats = {};

    lessonProgress.forEach(lp => {
      if (!lessonStats[lp.lesson_id]) {
        lessonStats[lp.lesson_id] = {
          lesson_id: lp.lesson_id,
          title: lp.lesson_title || "Unknown",
          watchTime: 0,
          completions: 0,
        };
      }
      lessonStats[lp.lesson_id].watchTime += lp.watch_time || 0;
      if (lp.completed_at) {
        lessonStats[lp.lesson_id].completions++;
      }
    });

    return Object.values(lessonStats)
      .map(stat => ({
        id: stat.lesson_id,
        title: stat.title,
        watchTime: stat.watchTime,
        completions: stat.completions,
        completionRate: stat.watchTime > 0 ? stat.completions : 0,
      }))
      .sort((a, b) => b.watchTime - a.watchTime);
  };

  /**
   * Calculate quiz performance
   */
  const calculateQuizPerformance = (quizAttempts) => {
    const quizStats = {};

    quizAttempts.forEach(qa => {
      if (!quizStats[qa.quiz_id]) {
        quizStats[qa.quiz_id] = {
          quiz_id: qa.quiz_id,
          title: qa.quiz_title || "Unknown",
          attempts: 0,
          totalScore: 0,
        };
      }
      quizStats[qa.quiz_id].attempts++;
      quizStats[qa.quiz_id].totalScore += qa.score || 0;
    });

    return Object.values(quizStats)
      .map(stat => ({
        id: stat.quiz_id,
        title: stat.title,
        attempts: stat.attempts,
        avgScore: stat.attempts > 0 ? stat.totalScore / stat.attempts : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  };

  /**
   * Fetch top courses for instructor
   */
  const fetchTopCourses = async (instructorId) => {
    try {
      const { data: courses, error } = await fetch(
        `/api/courses?instructor_id=${instructorId}`
      );

      if (error) throw error;

      const courseStats = await Promise.all(
        (courses || []).map(async (course) => {
          const { data: enrollments } = await fetch(
            `/api/enrollments?course_id=${course.id}`
          );

          const { data: payments } = await fetch(
            `/api/payments?course_id=${course.id}`
          );

          return {
            id: course.id,
            title: course.title,
            enrollments: enrollments?.length || 0,
            revenue: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
          };
        })
      );

      return courseStats.sort((a, b) => b.enrollments - a.enrollments).slice(0, 5);
    } catch (err) {
      console.error("Error fetching top courses:", err);
      return [];
    }
  };

  return {
    fetchCourseAnalytics,
    fetchInstructorAnalytics,
    loading,
    error,
  };
};