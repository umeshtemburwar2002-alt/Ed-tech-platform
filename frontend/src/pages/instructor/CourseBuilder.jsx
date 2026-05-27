import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { toast } from "react-hot-toast";
import { useSections } from "../../hooks/useSections";
import { useLessons } from "../../hooks/useLessons";
import { useUpload } from "../../hooks/useUpload";
import useCourseStore from "../../stores/courseStore";
import { FaPlus, FaTrash, FaEdit, FaChevronDown, FaChevronRight, FaVideo, FaFilePdf, FaFileAlt, FaQuestionCircle, FaClipboardList, FaDesktop, FaSave, FaEye, FaGripVertical, FaCheckCircle, FaTimes } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  const { fetchSections, createSection, updateSection, deleteSection, reorderSections } = useSections();
  const { fetchLessons, createLesson, updateLesson, deleteLesson, reorderLessons } = useLessons();
  const { uploadVideo, uploadPDF, uploadResource, deleteFile } = useUpload();
  
  const { selectedCourse, sections, setSections, selectedLesson, setSelectedLesson } = useCourseStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [lessonType, setLessonType] = useState("video");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resources, setResources] = useState([]);

  // Fetch course structure
  const fetchCourseStructure = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const { data: sectionsData, error: sectionsError } = await fetchSections(courseId);
      if (sectionsError) throw sectionsError;
      
      setSections(sectionsData || []);
      
      // Expand first section by default
      if (sectionsData && sectionsData.length > 0) {
        setExpandedSections({ [sectionsData[0].id]: true });
      }
    } catch (error) {
      console.error("Error fetching course structure:", error);
      toast.error("Failed to load course structure");
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchSections, setSections]);

  useEffect(() => {
    fetchCourseStructure();
  }, [fetchCourseStructure]);

  // Fetch lessons for a section
  const fetchSectionLessons = async (sectionId) => {
    try {
      const { data, error } = await fetchLessons(sectionId);
      if (error) throw error;
      
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, lessons: data || [] }
            : section
        )
      );
    } catch (error) {
      console.error("Error fetching section lessons:", error);
    }
  };

  // Add new section
  const handleAddSection = async () => {
    try {
      const maxOrder = sections.reduce((max, section) => Math.max(max, section.order_index || 0), 0);
      const { data, error } = await createSection(courseId, "New Section", maxOrder + 1);
      if (error) throw error;
      
      setSections([...sections, data]);
      setExpandedSections({ ...expandedSections, [data.id]: true });
      toast.success("Section added");
    } catch (error) {
      console.error("Error adding section:", error);
      toast.error("Failed to add section");
    }
  };

  // Add new lesson
  const handleAddLesson = async (sectionId) => {
    try {
      const { data: lessonsData } = await fetchLessons(sectionId);
      const maxOrder = lessonsData?.reduce((max, lesson) => Math.max(max, lesson.order_index || 0), 0) || 0;
      
      const { data, error } = await createLesson(sectionId, courseId, lessonType);
      if (error) throw error;
      
      // Update lesson order
      await reorderLessons([...lessonsData, { ...data, order_index: maxOrder + 1 }]);
      
      // Refresh section lessons
      await fetchSectionLessons(sectionId);
      toast.success("Lesson added");
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("Failed to add lesson");
    }
  };

  // Handle section drag end
  const onSectionDragEnd = async (result) => {
    if (!result.destination) return;

    const newOrder = Array.from(sections);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);

    setSections(newOrder.map((section, index) => ({ ...section, order_index: index })));
    
    await reorderSections(newOrder);
  };

  // Handle lesson drag end
  const onLessonDragEnd = async (sectionId, result) => {
    if (!result.destination) return;

    const section = sections.find((s) => s.id === sectionId);
    if (!section || !section.lessons) return;

    const newOrder = Array.from(section.lessons);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);

    const updatedLessons = newOrder.map((lesson, index) => ({ ...lesson, order_index: index }));
    
    await reorderLessons(updatedLessons);
    
    // Update section in store
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, lessons: updatedLessons } : s
      )
    );
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Select lesson
  const selectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setLessonType(lesson.type);
  };

  // Update lesson
  const handleSaveLesson = async () => {
    if (!selectedLesson) return;
    
    setSaving(true);
    try {
      const lessonData = {
        title: selectedLesson.title,
        description: selectedLesson.description,
        type: selectedLesson.type,
        status: selectedLesson.status || "draft",
        is_preview: selectedLesson.is_preview || false,
        duration: parseInt(selectedLesson.duration) || 0,
      };

      const { error } = await updateLesson(selectedLesson.id, lessonData);
      if (error) throw error;
      
      toast.success("Lesson saved");
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast.error("Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  // Upload video
  const handleVideoUpload = async (file) => {
    const path = `lesson-videos/${courseId}/${selectedLesson?.id}/${file.name}`;
    setUploadProgress(0);

    try {
      const { data, error } = await uploadVideo(file, path, (progress) => {
        setUploadProgress(progress);
      });
      
      if (error) throw error;
      
      const videoUrl = data?.publicUrl || data?.signedUrl;
      await updateLesson(selectedLesson.id, { video_url: videoUrl });
      setSelectedLesson((prev) => ({ ...prev, video_url: videoUrl }));
      
      toast.success("Video uploaded successfully");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploadProgress(0);
    }
  };

  // Upload PDF
  const handlePDFUpload = async (file) => {
    const path = `lesson-pdfs/${courseId}/${selectedLesson?.id}/${file.name}`;
    
    try {
      const { data, error } = await uploadPDF(file, path);
      if (error) throw error;
      
      await updateLesson(selectedLesson.id, { pdf_url: data.publicUrl });
      setSelectedLesson((prev) => ({ ...prev, pdf_url: data.publicUrl }));
      
      toast.success("PDF uploaded successfully");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Failed to upload PDF");
    }
  };

  // Upload resource
  const handleResourceUpload = async (file) => {
    const path = `lesson-resources/${selectedLesson?.id}/${file.name}`;
    
    try {
      const { data, error } = await uploadResource(file, selectedLesson.id);
      if (error) throw error;
      
      setResources([...resources, { name: file.name, url: data.publicUrl, size: file.size }]);
      toast.success("Resource added");
    } catch (error) {
      console.error("Error uploading resource:", error);
      toast.error("Failed to add resource");
    }
  };

  // Delete resource
  const handleDeleteResource = async (resourceIndex) => {
    const resource = resources[resourceIndex];
    if (!resource) return;

    try {
      await deleteFile("lesson-resources", resource.url.split("/").pop());
      setResources(resources.filter((_, i) => i !== resourceIndex));
      toast.success("Resource removed");
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to remove resource");
    }
  };

  // Calculate read time for article
  const calculateReadTime = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return Math.ceil(words / 200);
  };

  // Get lesson type icon
  const getLessonTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <FaVideo className="w-5 h-5" />;
      case "pdf":
        return <FaFilePdf className="w-5 h-5" />;
      case "article":
        return <FaFileAlt className="w-5 h-5" />;
      case "quiz":
        return <FaQuestionCircle className="w-5 h-5" />;
      case "assignment":
        return <FaClipboardList className="w-5 h-5" />;
      case "live":
        return <FaDesktop className="w-5 h-5" />;
      default:
        return <FaVideo className="w-5 h-5" />;
    }
  };

  // Get lesson type color
  const getLessonTypeColor = (type) => {
    switch (type) {
      case "video":
        return "text-red-500";
      case "pdf":
        return "text-orange-500";
      case "article":
        return "text-blue-500";
      case "quiz":
        return "text-purple-500";
      case "assignment":
        return "text-green-500";
      case "live":
        return "text-pink-500";
      default:
        return "text-gray-500";
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Panel - Course Structure */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Course Structure
          </h2>
          {selectedCourse && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {sections.length} sections • {sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0)} lessons
            </div>
          )}
        </div>

        {/* Sections List */}
        <DragDropContext onDragEnd={onSectionDragEnd}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <AnimatePresence>
              {sections.map((section, sectionIndex) => (
                <Droppable droppableId={section.id} key={section.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`mb-2 rounded-lg border-2 transition-colors ${
                        snapshot.isDraggingOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <Draggable draggableId={section.id} index={sectionIndex} key={section.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 ${snapshot.isDragging ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <FaGripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              >
                                {expandedSections[section.id] ? (
                                  <FaChevronDown />
                                ) : (
                                  <FaChevronRight />
                                )}
                              </button>
                              <input
                                type="text"
                                value={section.title}
                                onChange={async (e) => {
                                  await updateSection(section.id, { title: e.target.value });
                                }}
                                className="flex-1 font-medium text-gray-900 dark:text-white bg-transparent border-none focus:outline-none"
                              />
                              <span className="text-xs text-gray-500">
                                {section.lessons?.length || 0} lessons
                              </span>
                              <button
                                onClick={() => handleAddLesson(section.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <FaPlus />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Delete this section and all its lessons?")) {
                                    await deleteSection(section.id);
                                    setSections(sections.filter((s) => s.id !== section.id));
                                  }
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>

                      {/* Lessons */}
                      <AnimatePresence>
                        {expandedSections[section.id] && section.lessons && (
                          <div className="ml-8 mt-2 space-y-1">
                            <Droppable droppableId={`${section.id}-lessons` type="lesson">
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                  <AnimatePresence>
                                    {section.lessons.map((lesson, lessonIndex) => (
                                      <Draggable draggableId={lesson.id} index={lessonIndex} key={lesson.id}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`p-2 rounded border-2 bg-gray-50 dark:bg-gray-700 flex items-center gap-2 ${
                                              snapshot.isDragging ? "border-blue-500" : "border-transparent"
                                            }`}
                                          >
                                            <FaGripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                            <span className={getLessonTypeColor(lesson.type)}>
                                              {getLessonTypeIcon(lesson.type)}
                                            </span>
                                            <button
                                              onClick={() => selectLesson(lesson)}
                                              className={`flex-1 text-sm truncate ${
                                                selectedLesson?.id === lesson.id ? "text-blue-600 font-semibold" : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                              }`}
                                            >
                                              {lesson.title}
                                            </button>
                                            <span className="text-xs text-gray-500">
                                              {lesson.duration}s
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(lesson.status)}`}>
                                              {lesson.status}
                                            </span>
                                            <button
                                              onClick={() => selectLesson(lesson)}
                                              className="text-blue-600 hover:text-blue-700"
                                            >
                                              <FaEdit />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (confirm("Delete this lesson?")) {
                                                  await deleteLesson(lesson.id);
                                                  await fetchSectionLessons(section.id);
                                                }
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                            >
                                              <FaTrash />
                                            </button>
                                          </div>
                                        )}
                                      </Draggable>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </Droppable>
                            </div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            ))}
          </AnimatePresence>
        </DragDropContext>

        {/* Add Section Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleAddSection}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FaPlus /> Add Section
          </button>
        </div>
      </div>

      {/* Right Panel - Lesson Editor */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {selectedLesson ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Edit Lesson
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedLesson.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="text-sm text-gray-500">Saving...</span>
                  )}
                  <button
                    onClick={handleSaveLesson}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    <FaSave />
                    Save
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    onClick={() => navigate(`/instructor/courses/${courseId}/builder`)}
                  >
                    <FaEye />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title and Description */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lesson Title
                  </label>
                  <input
                    type="text"
                    value={selectedLesson.title}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={selectedLesson.description || ""}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Type Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Content Type
                </label>
                <div className="flex gap-2">
                  {["video", "pdf", "article", "quiz", "assignment", "live"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setLessonType(type)}
                      className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                        lessonType === type
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area based on type */}
              {lessonType === "video" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video Upload
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  {selectedLesson.video_url && (
                    <div className="mt-4">
                      <video
                        src={selectedLesson.video_url}
                        controls
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {lessonType === "pdf" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PDF Upload
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handlePDFUpload(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {selectedLesson.pdf_url && (
                    <iframe
                      src={selectedLesson.pdf_url}
                      className="w-full h-96 rounded-lg border border-gray-300 dark:border-gray-600"
                      title="PDF Preview"
                    />
                  )}
                </div>
              )}

              {lessonType === "article" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Article Content
                  </label>
                  <ReactQuill
                    value={selectedLesson.article_content || ""}
                    onChange={(value) => setSelectedLesson({ ...selectedLesson, article_content: value })}
                    theme="snow"
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Write your article content..."
                  />
                  {selectedLesson.article_content && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Estimated read time: {calculateReadTime(selectedLesson.article_content)} min
                    </p>
                  )}
                </div>
              )}

              {lessonType === "quiz" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FaQuestionCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>Quiz Builder will be implemented separately</p>
                  </div>
                </div>
              )}

              {lessonType === "assignment" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignment Details
                  </label>
                  <input
                    type="text"
                    value={selectedLesson.assignment_title || ""}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, assignment_title: e.target.value })}
                    placeholder="Assignment title"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                  />
                  <ReactQuill
                    value={selectedLesson.assignment_description || ""}
                    onChange={(value) => setSelectedLesson({ ...selectedLesson, assignment_description: value })}
                    theme="snow"
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                    placeholder="Assignment description..."
                  />
                </div>
              )}

              {lessonType === "live" && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Details
                  </label>
                  <input
                    type="url"
                    value={selectedLesson.meeting_link || ""}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, meeting_link: e.target.value })}
                    placeholder="Meeting link"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                  />
                  <input
                    type="text"
                    value={selectedLesson.meeting_password || ""}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, meeting_password: e.target.value })}
                    placeholder="Meeting password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="datetime-local"
                    value={selectedLesson.scheduled_at || ""}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Common Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedLesson.duration || 0}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, duration: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={selectedLesson.status || "draft"}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLesson.is_preview || false}
                        onChange={(e) => setSelectedLesson({ ...selectedLesson, is_preview: e.target.checked })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preview Lesson (Free Access)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Resources
                  </h3>
                  <button
                    onClick={() => document.getElementById("resource-upload").click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaPlus /> Add Resource
                  </button>
                  <input
                    id="resource-upload"
                    type="file"
                    onChange={(e) => handleResourceUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>
                <div className="space-y-2">
                  {resources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{resource.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteResource(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  {resources.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No resources added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FaEdit className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">Select a lesson to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseBuilder;