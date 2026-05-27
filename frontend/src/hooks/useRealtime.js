import { useEffect, useRef } from "react";
import { supabase } from "../config/supabaseClient";

export function useRealtime() {
  const subscribeToEnrollments = (instructorId, callback) => {
    const channel = supabase
      .channel("enrollments-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
          filter: `course_id=in.${instructorId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToAnnouncements = (courseId, callback) => {
    const channel = supabase
      .channel(`announcements-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToNotifications = (userId, callback) => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToCourseChanges = (courseId, callback) => {
    const channel = supabase
      .channel(`course-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `id=eq.${courseId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToCourseUpdates = (instructorId, callback) => {
    const channel = supabase
      .channel("instructor-courses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `instructor_id=eq.${instructorId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToLessonProgress = (courseId, callback) => {
    const channel = supabase
      .channel(`lesson-progress-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_progress",
        },
        async (payload) => {
          // Get course_id from lesson_id
          if (payload.new && payload.new.lesson_id) {
            const { data: lesson } = await supabase
              .from("course_lessons")
              .select("course_id")
              .eq("id", payload.new.lesson_id)
              .single();

            if (lesson && lesson.course_id === courseId) {
              callback(payload);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Custom hook for auto-cleanup
  const useRealtimeSubscription = (subscriptionFn, deps) => {
    const cleanupRef = useRef(null);

    useEffect(() => {
      cleanupRef.current = subscriptionFn();

      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      };
    }, deps);
  };

  return {
    subscribeToEnrollments,
    subscribeToAnnouncements,
    subscribeToNotifications,
    subscribeToCourseChanges,
    subscribeToCourseUpdates,
    subscribeToLessonProgress,
    useRealtimeSubscription,
  };
}