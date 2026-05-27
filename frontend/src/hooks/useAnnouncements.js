import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

/**
 * Hook for managing announcements
 * Provides CRUD operations for announcements
 */
export const useAnnouncements = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch announcements with optional filters
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status (draft, scheduled, sent)
   * @param {string} filters.priority - Filter by priority (high, normal, low)
   * @param {string} filters.course_id - Filter by course ID
   * @param {string} filters.instructor_id - Filter by instructor ID
   * @returns {Array} List of announcements
   */
  const fetchAnnouncements = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters.course_id) {
        params.append("course_id", filters.course_id);
      }
      if (filters.instructor_id) {
        params.append("instructor_id", filters.instructor_id);
      }

      const queryString = params.toString();
      const url = `/api/announcements${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      const { data, error } = await response.json();

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single announcement by ID
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Announcement data
   */
  const fetchAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${announcementId}`);
      const { data, error } = await response.json();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error fetching announcement:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new announcement
   * @param {Object} announcementData - Announcement data
   * @param {string} announcementData.title - Announcement title
   * @param {string} announcementData.content - Announcement content (HTML)
   * @param {string} announcementData.priority - Priority level (high, normal, low)
   * @param {string} announcementData.target_type - Target type (all, specific)
   * @param {Array} announcementData.target_courses - Array of course IDs
   * @param {string} announcementData.scheduled_for - ISO date string for scheduled send
   * @param {boolean} announcementData.send_push - Send push notification
   * @param {boolean} announcementData.send_email - Send email notification
   * @param {string} announcementData.status - Initial status (draft, scheduled)
   * @returns {Object} Created announcement
   */
  const createAnnouncement = useCallback(async (announcementData) => {
    if (!announcementData.title || !announcementData.content) {
      setError("Title and content are required");
      return { error: "Title and content are required" };
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...announcementData,
        instructor_id: user?.id,
        recipient_count: 0, // Will be calculated on the backend
      };

      // If scheduled, set status to scheduled
      if (announcementData.scheduled_for) {
        payload.status = "scheduled";
      }

      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const { data, error } = await response.json();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error creating announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Update an existing announcement
   * @param {string} announcementId - Announcement ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated announcement
   */
  const updateAnnouncement = useCallback(async (announcementId, updates) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return { error: "Announcement ID is required" };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const { data, error } = await response.json();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error updating announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete an announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Deletion result
   */
  const deleteAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return { error: "Announcement ID is required" };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "DELETE",
      });

      const { error } = await response.json();

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error("Error deleting announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send an announcement immediately
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Send result
   */
  const sendAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return { error: "Announcement ID is required" };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${announcementId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { data, error } = await response.json();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error sending announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel a scheduled announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Object} Cancellation result
   */
  const cancelScheduledAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return { error: "Announcement ID is required" };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${announcementId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { data, error } = await response.json();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error cancelling announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get announcement statistics
   * @param {string} instructorId - Instructor ID (optional)
   * @returns {Object} Statistics
   */
  const getAnnouncementStats = useCallback(async (instructorId = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = instructorId ? `?instructor_id=${instructorId}` : "";
      const response = await fetch(`/api/announcements/stats${params}`);
      const { data, error } = await response.json();

      if (error) throw error;

      return data || {
        total: 0,
        draft: 0,
        scheduled: 0,
        sent: 0,
        totalRecipients: 0,
      };
    } catch (err) {
      console.error("Error fetching announcement stats:", err);
      setError(err.message);
      return {
        total: 0,
        draft: 0,
        scheduled: 0,
        sent: 0,
        totalRecipients: 0,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duplicate an announcement
   * @param {string} announcementId - Announcement ID to duplicate
   * @returns {Object} New announcement
   */
  const duplicateAnnouncement = useCallback(async (announcementId) => {
    if (!announcementId) {
      setError("Announcement ID is required");
      return { error: "Announcement ID is required" };
    }

    setLoading(true);
    setError(null);

    try {
      // First fetch the original announcement
      const original = await fetchAnnouncement(announcementId);
      if (!original) {
        throw new Error("Original announcement not found");
      }

      // Create a copy with modified title and reset status
      const duplicateData = {
        title: `${original.title} (Copy)`,
        content: original.content,
        priority: original.priority,
        target_type: original.target_type,
        target_courses: original.target_courses,
        scheduled_for: null, // Reset schedule
        send_push: original.send_push,
        send_email: original.send_email,
        status: "draft", // Reset to draft
      };

      return await createAnnouncement(duplicateData);
    } catch (err) {
      console.error("Error duplicating announcement:", err);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchAnnouncement, createAnnouncement]);

  return {
    fetchAnnouncements,
    fetchAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    sendAnnouncement,
    cancelScheduledAnnouncement,
    getAnnouncementStats,
    duplicateAnnouncement,
    loading,
    error,
  };
};