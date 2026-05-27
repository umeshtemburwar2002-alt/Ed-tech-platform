import { supabase } from "./supabaseClient";

/**
 * Service for analytics-related operations
 * Handles data fetching and calculations for course analytics
 */
export const analyticsService = {
  /**
   * Fetch course overview metrics
   * @param {string} courseId - Course ID
   * @param {Date} startDate - Start date for data range
   * @param {Date} endDate - End date for data range
   * @returns {Object} Overview metrics
   */
  async getCourseOverview(courseId, startDate, endDate) {
    try {
      // Fetch enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact" })
        .eq("course_id", courseId)
        .gte("enrolled_at", startDate.toISOString())
        .lte("enrolled_at", endDate.toISOString());

      if (enrollmentsError) throw enrollmentsError;

      // Fetch active students (last activity within 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: activeStudents, error: activeError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact" })
        .eq("course_id", courseId)
        .gte("last_activity_at", sevenDaysAgo.toISOString());

      if (activeError) throw activeError;

      // Fetch lesson progress
      const { data: lessonProgress, error: progressError } = await supabase
        .from("lesson_progress")
        .select("*, lessons(title)", { count: "exact" })
        .eq("course_id", courseId);

      if (progressError) throw progressError;

      // Calculate completion rate
      const completedLessons = lessonProgress?.filter(lp => lp.completed_at).length || 0;
      const totalLessons = lessonProgress?.length || 0;
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating", { count: "exact" })
        .eq("course_id", courseId);

      if (reviewsError) throw reviewsError;

      // Calculate average rating
      const avgRating = reviews?.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Fetch payments for revenue
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount", { count: "exact" })
        .eq("course_id", courseId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .eq("status", "completed");

      if (paymentsError) throw paymentsError;

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Calculate total watch time
      const totalWatchTime = lessonProgress?.reduce((sum, lp) => sum + (lp.watch_time || 0), 0) || 0;

      return {
        totalEnrollments: enrollments?.length || 0,
        activeStudents: activeStudents?.length || 0,
        completionRate,
        avgRating,
        totalRevenue,
        totalWatchTime,
      };
    } catch (error) {
      console.error("Error fetching course overview:", error);
      throw error;
    }
  },

  /**
   * Fetch enrollment trend data
   * @param {string} courseId - Course ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Trend data points
   */
  async getEnrollmentTrend(courseId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("enrolled_at")
        .eq("course_id", courseId)
        .gte("enrolled_at", startDate.toISOString())
        .lte("enrolled_at", endDate.toISOString())
        .order("enrolled_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const grouped = {};
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        grouped[key] = 0;
      }

      data?.forEach(item => {
        const itemDate = new Date(item.enrolled_at).toISOString().split('T')[0];
        if (grouped.hasOwnProperty(itemDate)) {
          grouped[itemDate]++;
        }
      });

      // Convert to array
      return Object.entries(grouped).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        enrollments: count,
      }));
    } catch (error) {
      console.error("Error fetching enrollment trend:", error);
      throw error;
    }
  },

  /**
   * Fetch lesson completion rates
   * @param {string} courseId - Course ID
   * @returns {Array} Lesson completion rates
   */
  async getLessonCompletionRates(courseId) {
    try {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*, lessons(id, title)")
        .eq("course_id", courseId);

      if (error) throw error;

      const lessonStats = {};

      data?.forEach(lp => {
        const lessonId = lp.lesson_id;
        const lessonTitle = lp.lessons?.title || "Unknown";
        
        if (!lessonStats[lessonId]) {
          lessonStats[lessonId] = {
            lesson: lessonTitle,
            total: 0,
            completed: 0,
          };
        }
        lessonStats[lessonId].total++;
        if (lp.completed_at) {
          lessonStats[lessonId].completed++;
        }
      });

      return Object.values(lessonStats).map(stat => ({
        lesson: stat.lesson,
        completion: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
      }));
    } catch (error) {
      console.error("Error fetching lesson completion rates:", error);
      throw error;
    }
  },

  /**
   * Fetch demographic data
   * @param {string} courseId - Course ID
   * @returns {Array} Demographic distribution
   */
  async getDemographicData(courseId) {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("profiles(location)")
        .eq("course_id", courseId);

      if (error) throw error;

      const demographic = {};

      data?.forEach(e => {
        const location = e.profiles?.location || "Unknown";
        demographic[location] = (demographic[location] || 0) + 1;
      });

      return Object.entries(demographic).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error fetching demographic data:", error);
      throw error;
    }
  },

  /**
   * Fetch revenue trend data
   * @param {string} courseId - Course ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Revenue trend data
   */
  async getRevenueTrend(courseId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("created_at, amount")
        .eq("course_id", courseId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const grouped = {};
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        grouped[key] = 0;
      }

      data?.forEach(item => {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        if (grouped.hasOwnProperty(itemDate)) {
          grouped[itemDate] += item.amount || 0;
        }
      });

      // Convert to array
      return Object.entries(grouped).map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
      }));
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      throw error;
    }
  },

  /**
   * Fetch lesson performance data
   * @param {string} courseId - Course ID
   * @returns {Array} Lesson performance metrics
   */
  async getLessonPerformance(courseId) {
    try {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*, lessons(id, title)")
        .eq("course_id", courseId);

      if (error) throw error;

      const lessonStats = {};

      data?.forEach(lp => {
        const lessonId = lp.lesson_id;
        const lessonTitle = lp.lessons?.title || "Unknown";
        
        if (!lessonStats[lessonId]) {
          lessonStats[lessonId] = {
            id: lessonId,
            title: lessonTitle,
            watchTime: 0,
            completions: 0,
          };
        }
        lessonStats[lessonId].watchTime += lp.watch_time || 0;
        if (lp.completed_at) {
          lessonStats[lessonId].completions++;
        }
      });

      return Object.values(lessonStats)
        .sort((a, b) => b.watchTime - a.watchTime)
        .map(stat => ({
          ...stat,
          completionRate: stat.watchTime > 0 ? stat.completions : 0,
        }));
    } catch (error) {
      console.error("Error fetching lesson performance:", error);
      throw error;
    }
  },

  /**
   * Fetch quiz performance data
   * @param {string} courseId - Course ID
   * @returns {Array} Quiz performance metrics
   */
  async getQuizPerformance(courseId) {
    try {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, quizzes(id, title)")
        .eq("course_id", courseId);

      if (error) throw error;

      const quizStats = {};

      data?.forEach(qa => {
        const quizId = qa.quiz_id;
        const quizTitle = qa.quizzes?.title || "Unknown";
        
        if (!quizStats[quizId]) {
          quizStats[quizId] = {
            id: quizId,
            title: quizTitle,
            attempts: 0,
            totalScore: 0,
          };
        }
        quizStats[quizId].attempts++;
        quizStats[quizId].totalScore += qa.score || 0;
      });

      return Object.values(quizStats)
        .map(stat => ({
          ...stat,
          avgScore: stat.attempts > 0 ? stat.totalScore / stat.attempts : 0,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);
    } catch (error) {
      console.error("Error fetching quiz performance:", error);
      throw error;
    }
  },

  /**
   * Fetch top courses for an instructor
   * @param {string} instructorId - Instructor ID
   * @returns {Array} Top courses with metrics
   */
  async getTopCourses(instructorId, limit = 5) {
    try {
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", instructorId)
        .eq("status", "published");

      if (coursesError) throw coursesError;

      const courseStats = await Promise.all(
        courses?.map(async (course) => {
          // Fetch enrollments
          const { count: enrollments } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          // Fetch payments
          const { data: payments } = await supabase
            .from("payments")
            .select("amount")
            .eq("course_id", course.id)
            .eq("status", "completed");

          const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

          return {
            id: course.id,
            title: course.title,
            enrollments: enrollments || 0,
            revenue,
          };
        }) || []
      );

      return courseStats.sort((a, b) => b.enrollments - a.enrollments).slice(0, limit);
    } catch (error) {
      console.error("Error fetching top courses:", error);
      throw error;
    }
  },

  /**
   * Fetch comprehensive analytics for a course
   * @param {string} courseId - Course ID
   * @param {string} dateRange - Date range (7d, 30d, 90d, 1y)
   * @returns {Object} Complete analytics data
   */
  async getCourseAnalytics(courseId, dateRange = "30d") {
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

    const [overview, enrollmentsTrend, completionRates, demographic, revenueTrend, lessonPerformance, quizPerformance] = await Promise.all([
      this.getCourseOverview(courseId, startDate, now),
      this.getEnrollmentTrend(courseId, startDate, now),
      this.getLessonCompletionRates(courseId),
      this.getDemographicData(courseId),
      this.getRevenueTrend(courseId, startDate, now),
      this.getLessonPerformance(courseId),
      this.getQuizPerformance(courseId),
    ]);

    return {
      overview,
      enrollmentsTrend,
      completionRates,
      demographic,
      revenueData: revenueTrend,
      lessonPerformance,
      quizPerformance,
    };
  },

  /**
   * Fetch instructor-level analytics
   * @param {string} instructorId - Instructor ID
   * @param {string} dateRange - Date range
   * @returns {Object} Instructor analytics
   */
  async getInstructorAnalytics(instructorId, dateRange = "30d") {
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

    // Fetch all courses
    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .eq("instructor_id", instructorId);

    // Aggregate analytics from all courses
    const courseAnalytics = await Promise.all(
      courses?.map(course => this.getCourseAnalytics(course.id, dateRange)) || []
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
        enrollmentsTrend: this.aggregateTrendData(acc.enrollmentsTrend, analytics.enrollmentsTrend),
        revenueData: this.aggregateTrendData(acc.revenueData, analytics.revenueData),
        lessonPerformance: [...acc.lessonPerformance, ...analytics.lessonPerformance],
        quizPerformance: [...acc.quizPerformance, ...analytics.quizPerformance],
        topCourses: [],
      };
    }, {
      overview: { totalEnrollments: 0, activeStudents: 0, completionRate: 0, avgRating: 0, totalRevenue: 0, totalWatchTime: 0 },
      enrollmentsTrend: [],
      revenueData: [],
      lessonPerformance: [],
      quizPerformance: [],
      topCourses: [],
    });

    // Calculate averages
    const courseCount = courses?.length || 1;
    aggregated.overview.completionRate /= courseCount;
    aggregated.overview.avgRating /= courseCount;

    // Fetch top courses
    aggregated.topCourses = await this.getTopCourses(instructorId);

    return aggregated;
  },

  /**
   * Helper function to aggregate trend data from multiple courses
   */
  aggregateTrendData(data1, data2) {
    const aggregated = [...data1];
    
    data2?.forEach(item => {
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
  },
};