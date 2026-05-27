import { supabase } from "../config/supabaseClient";

export function useLessons() {
  const fetchLessons = async (sectionId) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("section_id", sectionId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching lessons:", error);
      return { data: null, error };
    }
  };

  const createLesson = async (sectionId, courseId, type = "video") => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          section_id: sectionId,
          course_id: courseId,
          title: "New Lesson",
          type: type,
          duration: 0,
          order_index: 0,
          is_preview: false,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error creating lesson:", error);
      return { data: null, error };
    }
  };

  const updateLesson = async (id, data) => {
    try {
      const updates = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from("course_lessons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: result, error: null };
    } catch (error) {
      console.error("Error updating lesson:", error);
      return { data: null, error };
    }
  };

  const deleteLesson = async (id) => {
    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting lesson:", error);
      return { error };
    }
  };

  const reorderLessons = async (lessons) => {
    try {
      const updates = lessons.map((lesson, index) => ({
        id: lesson.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from("course_lessons")
        .upsert(updates);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error reordering lessons:", error);
      return { error };
    }
  };

  const getLessonById = async (id) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching lesson:", error);
      return { data: null, error };
    }
  };

  return {
    fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    getLessonById,
  };
}