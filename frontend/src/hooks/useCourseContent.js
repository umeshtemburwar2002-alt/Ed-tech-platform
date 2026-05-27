import { useState } from "react";
import { supabase } from "../config/supabaseClient";
import toast from "react-hot-toast";

/**
 * Hook for managing course sections and lessons (Course Content)
 * Handles CRUD operations for course content structure
 */
const useCourseContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all sections with lessons for a course
  const fetchCourseContent = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sections, error: sectionsError } = await supabase
        .from("course_sections")
        .select(`
          *,
          course_lessons (*)
        `)
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Sort lessons within each section
      const sectionsWithSortedLessons = sections.map(section => ({
        ...section,
        course_lessons: section.course_lessons
          .sort((a, b) => a.order_index - b.order_index)
      }));

      return sectionsWithSortedLessons || [];
    } catch (err) {
      setError(err.message);
      toast.error("Failed to fetch course content");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create a new section
  const createSection = async (courseId, title, description = "") => {
    setLoading(true);
    setError(null);
    try {
      // Get current max order_index
      const { data: existingSections } = await supabase
        .from("course_sections")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = existingSections && existingSections.length > 0 
        ? existingSections[0].order_index + 1 
        : 0;

      const { data, error } = await supabase
        .from("course_sections")
        .insert({
          course_id: courseId,
          title,
          description,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Section added");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to add section");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a section
  const updateSection = async (sectionId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("course_sections")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sectionId)
        .select()
        .single();

      if (error) throw error;
      toast.success("Section updated");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to update section");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a section (and its lessons)
  const deleteSection = async (sectionId) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("course_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      toast.success("Section deleted");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to delete section");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create a new lesson
  const createLesson = async (sectionId, lessonData) => {
    setLoading(true);
    setError(null);
    try {
      // Get current max order_index in this section
      const { data: existingLessons } = await supabase
        .from("course_lessons")
        .select("order_index")
        .eq("section_id", sectionId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = existingLessons && existingLessons.length > 0 
        ? existingLessons[0].order_index + 1 
        : 0;

      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          section_id: sectionId,
          title: lessonData.title || "New Lesson",
          description: lessonData.description || "",
          content_type: lessonData.content_type || "video",
          video_url: lessonData.video_url || null,
          text_content: lessonData.text_content || null,
          duration: lessonData.duration || 0,
          is_preview: lessonData.is_preview || false,
          access_level: lessonData.access_level || "free",
          is_published: lessonData.is_published || false,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Lesson added");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to add lesson");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a lesson
  const updateLesson = async (lessonId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If publishing, set published_at
      if (updates.is_published && !updates.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("course_lessons")
        .update(updateData)
        .eq("id", lessonId)
        .select()
        .single();

      if (error) throw error;
      toast.success("Lesson updated");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to update lesson");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a lesson
  const deleteLesson = async (lessonId) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;
      toast.success("Lesson deleted");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to delete lesson");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reorder sections
  const reorderSections = async (orderedIds) => {
    setLoading(true);
    setError(null);
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      const { error } = await supabase
        .from("course_sections")
        .upsert(updates);

      if (error) throw error;
      toast.success("Sections reordered");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to reorder sections");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reorder lessons within a section
  const reorderLessons = async (sectionId, orderedIds) => {
    setLoading(true);
    setError(null);
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      const { error } = await supabase
        .from("course_lessons")
        .upsert(updates);

      if (error) throw error;
      toast.success("Lessons reordered");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to reorder lessons");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Move lesson to different section
  const moveLessonToSection = async (lessonId, newSectionId, newOrderIndex) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({
          section_id: newSectionId,
          order_index: newOrderIndex,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lessonId);

      if (error) throw error;
      toast.success("Lesson moved");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to move lesson");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get course content summary
  const getCourseContentSummary = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("course_content_view")
        .select("*")
        .eq("course_id", courseId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchCourseContent,
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderSections,
    reorderLessons,
    moveLessonToSection,
    getCourseContentSummary,
  };
};

export default useCourseContent;