import { supabase } from "./supabaseClient";

/**
 * Service for announcement-related operations
 * Handles CRUD operations for announcements in Supabase
 */
export const announcementService = {
  /**
   * Fetch announcements with optional filters
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status (draft, scheduled, sent)
   * @param {string} filters.priority - Filter by priority (high, normal, low)
   * @param {string} filters.course_id - Filter by course ID
   * @param {string} filters.instructor_id - Filter by instructor ID
   * @returns {Array} List of announcements
   */
  async fetchAnnouncements(filters = {}) {
    try {
      let query = supabase
        .from("announcements")
        .select("*, instructor:instructor_id(id, full_name, avatar_url)")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters.course_id) {
        query = query.eq("course_id", filters.course_id);
      }
      if (filters.instructor_id) {
        query = query.eq("instructor_id", filters.instructor_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error fetching announcements:", error);
      throw error;
    }
  },

  /**
   * Fetch a single announcement by ID
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Announcement data
   */
  async fetchAnnouncementById(announcementId) {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, instructor:instructor_id(id, full_name, avatar_url)")
        .eq("id", announcementId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error fetching announcement:", error);
      throw error;
    }
  },

  /**
   * Create a new announcement
   * @param {Object} announcementData - Announcement data
   * @returns {Object} Created announcement
   */
  async createAnnouncement(announcementData) {
    try {
      const payload = {
        title: announcementData.title,
        content: announcementData.content,
        priority: announcementData.priority || "normal",
        target_type: announcementData.target_type || "all",
        target_courses: announcementData.target_courses || [],
        scheduled_for: announcementData.scheduled_for || null,
        send_push: announcementData.send_push !== false,
        send_email: announcementData.send_email || false,
        status: announcementData.scheduled_for ? "scheduled" : "draft",
        instructor_id: announcementData.instructor_id,
        recipient_count: 0,
      };

      const { data, error } = await supabase
        .from("announcements")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Create notifications if sending immediately
      if (!announcementData.scheduled_for) {
        await this.createNotificationsForAnnouncement(data.id, data);
      }

      return data;
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  },

  /**
   * Update an existing announcement
   * @param {string} announcementId - Announcement ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated announcement
   */
  async updateAnnouncement(announcementId, updates) {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", announcementId)
        .select()
        .single();

      if (error) throw error;

      // Update status if scheduled date changed
      if (updates.scheduled_for) {
        await supabase
          .from("announcements")
          .update({ status: "scheduled" })
          .eq("id", announcementId);
      }

      return data;
    } catch (error) {
      console.error("Error updating announcement:", error);
      throw error;
    }
  },

  /**
   * Delete an announcement
   * @param {string} announcementId - Announcement ID
   * @returns {boolean} Success status
   */
  async deleteAnnouncement(announcementId) {
    try {
      // Delete associated notifications first
      await supabase
        .from("notifications")
        .delete()
        .eq("announcement_id", announcementId);

      // Delete the announcement
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting announcement:", error);
      throw error;
    }
  },

  /**
   * Send an announcement immediately
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Updated announcement
   */
  async sendAnnouncement(announcementId) {
    try {
      // Fetch the announcement
      const announcement = await this.fetchAnnouncementById(announcementId);
      
      if (!announcement) {
        throw new Error("Announcement not found");
      }

      // Create notifications for recipients
      const notificationCount = await this.createNotificationsForAnnouncement(announcementId, announcement);

      // Update announcement status
      const { data, error } = await supabase
        .from("announcements")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          recipient_count: notificationCount,
        })
        .eq("id", announcementId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error sending announcement:", error);
      throw error;
    }
  },

  /**
   * Cancel a scheduled announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Updated announcement
   */
  async cancelScheduledAnnouncement(announcementId) {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .update({
          status: "draft",
          scheduled_for: null,
        })
        .eq("id", announcementId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error cancelling announcement:", error);
      throw error;
    }
  },

  /**
   * Create notifications for announcement recipients
   * @param {string} announcementId - Announcement ID
   * @param {Object} announcement - Announcement data
   * @returns {number} Number of notifications created
   */
  async createNotificationsForAnnouncement(announcementId, announcement) {
    try {
      // Determine target audience
      let targetUserIds = [];

      if (announcement.target_type === "all") {
        // Fetch all enrolled students across all courses for the instructor
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .in("course_id", announcement.target_courses.length > 0 ? announcement.target_courses : await this.getInstructorCourseIds(announcement.instructor_id));

        targetUserIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
      } else if (announcement.target_type === "specific" && announcement.target_courses?.length > 0) {
        // Fetch students enrolled in specific courses
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .in("course_id", announcement.target_courses);

        targetUserIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
      }

      if (targetUserIds.length === 0) {
        return 0;
      }

      // Create notifications in batches
      const batchSize = 100;
      let createdCount = 0;

      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        const notifications = batch.map(userId => ({
          user_id: userId,
          type: "announcement",
          title: announcement.title,
          message: announcement.content,
          announcement_id: announcementId,
          is_read: false,
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("notifications")
          .insert(notifications);

        if (error) {
          console.error("Error creating notifications batch:", error);
        } else {
          createdCount += batch.length;
        }
      }

      return createdCount;
    } catch (error) {
      console.error("Error creating notifications:", error);
      throw error;
    }
  },

  /**
   * Get instructor's course IDs
   * @param {string} instructorId - Instructor ID
   * @returns {Array} Course IDs
   */
  async getInstructorCourseIds(instructorId) {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id")
        .eq("instructor_id", instructorId);

      if (error) throw error;

      return data?.map(c => c.id) || [];
    } catch (error) {
      console.error("Error fetching instructor course IDs:", error);
      return [];
    }
  },

  /**
   * Get announcement statistics
   * @param {string} instructorId - Instructor ID (optional)
   * @returns {Object} Statistics
   */
  async getAnnouncementStats(instructorId = null) {
    try {
      let query = supabase
        .from("announcements")
        .select("status, recipient_count");

      if (instructorId) {
        query = query.eq("instructor_id", instructorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        draft: 0,
        scheduled: 0,
        sent: 0,
        totalRecipients: 0,
      };

      data?.forEach(a => {
        if (a.status === "draft") stats.draft++;
        if (a.status === "scheduled") stats.scheduled++;
        if (a.status === "sent") stats.sent++;
        stats.totalRecipients += a.recipient_count || 0;
      });

      return stats;
    } catch (error) {
      console.error("Error fetching announcement stats:", error);
      throw error;
    }
  },

  /**
   * Duplicate an announcement
   * @param {string} announcementId - Announcement ID to duplicate
   * @returns {Object} New announcement
   */
  async duplicateAnnouncement(announcementId) {
    try {
      const original = await this.fetchAnnouncementById(announcementId);
      
      if (!original) {
        throw new Error("Original announcement not found");
      }

      const duplicateData = {
        title: `${original.title} (Copy)`,
        content: original.content,
        priority: original.priority,
        target_type: original.target_type,
        target_courses: original.target_courses,
        scheduled_for: null,
        send_push: original.send_push,
        send_email: original.send_email,
        status: "draft",
        instructor_id: original.instructor_id,
      };

      return await this.createAnnouncement(duplicateData);
    } catch (error) {
      console.error("Error duplicating announcement:", error);
      throw error;
    }
  },

  /**
   * Mark announcement notifications as read
   * @param {string} announcementId - Announcement ID
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  async markAsRead(announcementId, userId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("announcement_id", announcementId)
        .eq("user_id", userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error marking announcement as read:", error);
      throw error;
    }
  },

  /**
   * Fetch unread announcements for a user
   * @param {string} userId - User ID
   * @returns {Array} Unread announcements
   */
  async fetchUnreadAnnouncements(userId) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, announcements(*)")
        .eq("user_id", userId)
        .eq("type", "announcement")
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error fetching unread announcements:", error);
      throw error;
    }
  },

  /**
   * Search announcements
   * @param {string} searchTerm - Search term
   * @param {string} instructorId - Instructor ID (optional)
   * @returns {Array} Search results
   */
  async searchAnnouncements(searchTerm, instructorId = null) {
    try {
      let query = supabase
        .from("announcements")
        .select("*, instructor:instructor_id(id, full_name, avatar_url)")
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order("created_at", { ascending: false });

      if (instructorId) {
        query = query.eq("instructor_id", instructorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error searching announcements:", error);
      throw error;
    }
  },

  /**
   * Process scheduled announcements (cron job helper)
   * Should be called by a scheduled function to send announcements whose time has come
   */
  async processScheduledAnnouncements() {
    try {
      const now = new Date().toISOString();

      const { data: scheduledAnnouncements, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_for", now);

      if (error) throw error;

      const results = await Promise.all(
        scheduledAnnouncements?.map(announcement => 
          this.sendAnnouncement(announcement.id)
        ) || []
      );

      return results;
    } catch (error) {
      console.error("Error processing scheduled announcements:", error);
      throw error;
    }
  },
};