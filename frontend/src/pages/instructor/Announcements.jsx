import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import { useCourses } from "../../hooks/useCourses";
import { FaPlus, FaEdit, FaTrash, FaSave, FaBell, FaClock, FaUsers, FaPaperPlane, FaFilter, FaCalendar, FaTag, FaCheckCircle, FaTimes, FaEnvelope } from "react-icons/fa";

const Announcements = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  
  const [announcements, setAnnouncements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    target_type: "all",
    target_courses: [],
    scheduled_for: null,
    send_push: true,
    send_email: false,
    status: "draft",
  });

  // Filters
  const [filters, setFilters] = useState({
    status: "all", // all, scheduled, sent, draft
    priority: "all", // all, high, normal, low
    course: "all",
  });

  const { 
    fetchAnnouncements: getAnnouncements, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement, 
    sendAnnouncement, 
    loading 
  } = useAnnouncements();
  const { fetchInstructorCourses } = useCourses();

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const courses = await fetchInstructorCourses(user?.id);
      setCourses(courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, [user?.id, fetchInstructorCourses]);

  // Fetch announcements
  const fetchAnnouncementsData = useCallback(async () => {
    const data = await getAnnouncements({
      status: filters.status,
      priority: filters.priority,
      course_id: filters.course === "all" ? undefined : filters.course,
      instructor_id: user?.id,
    });
    
    if (data) {
      setAnnouncements(data);
    }
  }, [filters, user?.id, getAnnouncements]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchAnnouncementsData();
  }, [fetchAnnouncementsData]);

  // Create announcement
  const handleCreateAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    if (form.target_type === "specific" && form.target_courses.length === 0) {
      toast.error("Please select at least one target course");
      return;
    }

    try {
      const data = await createAnnouncement({
        ...form,
        instructor_id: user?.id,
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      });

      if (data && !data.error) {
        setAnnouncements([data, ...announcements]);
        setIsCreating(false);
        setForm({
          title: "",
          content: "",
          priority: "normal",
          target_type: "all",
          target_courses: [],
          scheduled_for: null,
          send_push: true,
          send_email: false,
          status: "draft",
        });
        toast.success("Announcement created successfully");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
    }
  };

  // Update announcement
  const handleUpdateAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      const data = await updateAnnouncement(selectedAnnouncement.id, form);

      if (data && !data.error) {
        setAnnouncements(
          announcements.map((a) =>
            a.id === selectedAnnouncement.id ? { ...a, ...form } : a
          )
        );
        setSelectedAnnouncement(null);
        toast.success("Announcement updated successfully");
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement");
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (announcementId) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const result = await deleteAnnouncement(announcementId);

      if (result && !result.error) {
        setAnnouncements(announcements.filter((a) => a.id !== announcementId));
        if (selectedAnnouncement?.id === announcementId) {
          setSelectedAnnouncement(null);
        }
        toast.success("Announcement deleted");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  // Send announcement immediately
  const handleSendNow = async (announcementId) => {
    try {
      const result = await sendAnnouncement(announcementId);

      if (result && !result.error) {
        setAnnouncements(
          announcements.map((a) =>
            a.id === announcementId ? { ...a, status: "sent" } : a
          )
        );
        toast.success("Announcement sent successfully");
      }
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send announcement");
    }
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId) => {
    setForm((prev) => ({
      ...prev,
      target_courses: prev.target_courses.includes(courseId)
        ? prev.target_courses.filter((id) => id !== courseId)
        : [...prev.target_courses, courseId],
    }));
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              Announcements
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and send announcements to your students
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/instructor/courses")}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Courses
            </button>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus /> New Announcement
              </button>
            )}
          </div>
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

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Course Filter */}
            <select
              value={filters.course}
              onChange={(e) => setFilters({ ...filters, course: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Create/Edit Form */}
        <AnimatePresence>
          {(isCreating || selectedAnnouncement) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isCreating ? "Create Announcement" : "Edit Announcement"}
                </h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedAnnouncement(null);
                    setForm({
                      title: "",
                      content: "",
                      priority: "normal",
                      target_type: "all",
                      target_courses: [],
                      scheduled_for: null,
                      send_push: true,
                      send_email: false,
                      status: "draft",
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Announcement title"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content *
                  </label>
                  <ReactQuill
                    value={form.content}
                    onChange={(value) => setForm({ ...form, content: value })}
                    theme="snow"
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Write your announcement..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {["high", "normal", "low"].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => setForm({ ...form, priority })}
                        className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                          form.priority === priority
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Audience
                  </label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setForm({ ...form, target_type: "all", target_courses: [] })}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        form.target_type === "all"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      <FaUsers className="inline mr-2" /> All Students
                    </button>
                    <button
                      onClick={() => setForm({ ...form, target_type: "specific" })}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        form.target_type === "specific"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      <FaTag className="inline mr-2" /> Specific Courses
                    </button>
                  </div>

                  {form.target_type === "specific" && (
                    <div className="grid grid-cols-2 gap-2">
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={form.target_courses.includes(course.id)}
                            onChange={() => toggleCourseSelection(course.id)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {course.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule
                  </label>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!form.scheduled_for}
                        onChange={() => setForm({ ...form, scheduled_for: null })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Send Now</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!!form.scheduled_for}
                        onChange={(e) =>
                          e.target.checked &&
                          setForm({
                            ...form,
                            scheduled_for: new Date(Date.now() + 3600000).toISOString(),
                          })
                        }
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Schedule for later</span>
                    </label>
                  </div>

                  {form.scheduled_for && (
                    <input
                      type="datetime-local"
                      value={form.scheduled_for ? new Date(form.scheduled_for).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                      className="w-full mt-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  )}
                </div>

                {/* Notifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.send_push}
                        onChange={(e) => setForm({ ...form, send_push: e.target.checked })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        <FaBell className="inline mr-2" /> Push Notification
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.send_email}
                        onChange={(e) => setForm({ ...form, send_email: e.target.checked })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        <FaEnvelope className="inline mr-2" /> Email
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={isCreating ? handleCreateAnnouncement : handleUpdateAnnouncement}
                    disabled={saving}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaSave /> {saving ? "Saving..." : isCreating ? "Create" : "Update"}
                  </button>
                  {!isCreating && (
                    <button
                      onClick={() => handleSendNow(selectedAnnouncement.id)}
                      disabled={sending}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaPaperPlane /> {sending ? "Sending..." : "Send Now"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Announcements List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Announcements ({announcements.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {announcements.map((announcement) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            announcement.status
                          )}`}
                        >
                          {announcement.status}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                            announcement.priority
                          )}`}
                        >
                          {announcement.priority}
                        </span>
                      </div>
                      <div
                        className="text-sm text-gray-600 dark:text-gray-400 mb-2"
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                      />
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <FaCalendar /> {formatDate(announcement.created_at)}
                        </span>
                        {announcement.scheduled_for && (
                          <span className="flex items-center gap-1">
                            <FaClock /> Scheduled: {formatDate(announcement.scheduled_for)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FaUsers /> {announcement.recipient_count || 0} recipients
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setForm({
                            title: announcement.title,
                            content: announcement.content,
                            priority: announcement.priority,
                            target_type: announcement.target_type,
                            target_courses: announcement.target_courses || [],
                            scheduled_for: announcement.scheduled_for,
                            send_push: announcement.send_push,
                            send_email: announcement.send_email,
                            status: announcement.status,
                          });
                          setIsCreating(false);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-700"
                      >
                        <FaEdit />
                      </button>
                      {announcement.status === "draft" && (
                        <button
                          onClick={() => handleSendNow(announcement.id)}
                          disabled={sending}
                          className="p-2 text-green-600 hover:text-green-700"
                        >
                          <FaPaperPlane />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {announcements.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <FaBell className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No announcements yet</p>
                <p>Create your first announcement to get started</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Announcements;