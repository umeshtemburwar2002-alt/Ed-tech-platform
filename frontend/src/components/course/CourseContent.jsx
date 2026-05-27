import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaChevronDown, 
  FaChevronRight, 
  FaPlayCircle, 
  FaFileText, 
  FaClock, 
  FaLock, 
  FaCheckCircle,
  FaVideo,
  FaBookOpen,
  FaPlus,
  FaTrash,
  FaEdit
} from "react-icons/fa";
import useCourseContent from "../../hooks/useCourseContent";

/**
 * CourseContent Component
 * Dynamic course curriculum display with expandable sections and lessons
 * 
 * @param {string} courseId - Course ID
 * @param {boolean} editable - Whether the content is editable
 * @param {Function} onLessonClick - Callback when a lesson is clicked
 * @param {Function} onSectionEdit - Callback when a section is edited
 */
const CourseContent = ({ 
  courseId, 
  editable = false, 
  onLessonClick,
  onSectionEdit 
}) => {
  const { 
    fetchCourseContent, 
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    updateLesson,
    deleteLesson,
    loading 
  } = useCourseContent();

  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  useEffect(() => {
    if (courseId) {
      loadCourseContent();
    }
  }, [courseId]);

  const loadCourseContent = async () => {
    const data = await fetchCourseContent(courseId);
    if (data) {
      setSections(data);
      
      // Calculate totals
      let duration = 0;
      let lessonCount = 0;
      data.forEach(section => {
        section.course_lessons.forEach(lesson => {
          duration += lesson.duration || 0;
          lessonCount++;
        });
      });
      setTotalDuration(duration);
      setTotalLessons(lessonCount);

      // Expand first section by default
      if (data.length > 0) {
        setExpandedSections({ [data[0].id]: true });
      }
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getLessonIcon = (type) => {
    const icons = {
      video: FaVideo,
      pdf: FaFileText,
      article: FaBookOpen,
      quiz: FaCheckCircle,
      assignment: FaFileText,
      live: FaPlayCircle,
      text: FaBookOpen,
    };
    const Icon = icons[type] || FaVideo;
    return <Icon className="w-4 h-4" />;
  };

  const getLessonTypeBadge = (type) => {
    const badges = {
      video: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      pdf: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      article: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      quiz: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      assignment: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
      live: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      text: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400' },
    };
    return badges[type] || badges.video;
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    const newSection = await createSection(courseId, newSectionTitle.trim());
    if (newSection) {
      setSections([...sections, newSection]);
      setNewSectionTitle("");
      setShowAddSection(false);
      setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
      loadCourseContent(); // Reload to get fresh data
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (window.confirm("Are you sure you want to delete this section and all its lessons?")) {
      const success = await deleteSection(sectionId);
      if (success) {
        setSections(sections.filter(s => s.id !== sectionId));
        loadCourseContent();
      }
    }
  };

  if (loading && sections.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <FaBookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No course content yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Course sections and lessons will appear here once added
        </p>
        {editable && (
          <button
            onClick={() => setShowAddSection(true)}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Add First Section
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Course Stats */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FaBookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {sections.length} sections
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaPlayCircle className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {totalLessons} lessons
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatDuration(totalDuration)} total
            </span>
          </div>
        </div>
        {editable && (
          <button
            onClick={() => setShowAddSection(!showAddSection)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            Add Section
          </button>
        )}
      </div>

      {/* Add Section Form */}
      <AnimatePresence>
        {showAddSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Section title..."
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddSection(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, sectionIndex) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <button
                onClick={() => toggleSection(section.id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                <div className="text-gray-400">
                  {expandedSections[section.id] ? (
                    <FaChevronDown className="w-5 h-5" />
                  ) : (
                    <FaChevronRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Section {sectionIndex + 1}: {section.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {section.course_lessons?.length || 0} lessons • {formatDuration(
                      section.course_lessons?.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) || 0
                    )}
                  </p>
                </div>
              </button>
              
              {editable && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSectionEdit && onSectionEdit(section)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <FaEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Section Content */}
            <AnimatePresence>
              {expandedSections[section.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 space-y-2">
                    {section.course_lessons?.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                        No lessons in this section yet
                        {editable && (
                          <button
                            onClick={() => onSectionEdit && onSectionEdit(section)}
                            className="ml-2 text-purple-600 hover:text-purple-700"
                          >
                            Add Lesson
                          </button>
                        )}
                      </div>
                    ) : (
                      section.course_lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          onClick={() => !editable && onLessonClick && onLessonClick(lesson)}
                          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!editable ? 'cursor-pointer' : ''} transition-colors group`}
                        >
                          {/* Lesson Icon */}
                          <div className={`p-2 rounded-lg ${getLessonTypeBadge(lesson.content_type).bg}`}>
                            <div className={getLessonTypeBadge(lesson.content_type).text}>
                              {getLessonIcon(lesson.content_type)}
                            </div>
                          </div>

                          {/* Lesson Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {lesson.title}
                              </h4>
                              {lesson.is_preview && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                  Preview
                                </span>
                              )}
                              {!lesson.is_published && editable && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                  Draft
                                </span>
                              )}
                            </div>
                            {lesson.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          {/* Lesson Duration */}
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <FaClock className="w-3 h-3" />
                            <span>{formatDuration(lesson.duration)}</span>
                          </div>

                          {/* Lock Icon for non-preview lessons */}
                          {!lesson.is_preview && !editable && (
                            <FaLock className="w-4 h-4 text-gray-400" />
                          )}

                          {/* Play Icon for preview/published lessons */}
                          {(lesson.is_preview || lesson.is_published) && !editable && (
                            <FaPlayCircle className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CourseContent;