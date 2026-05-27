import { supabase } from "../config/supabaseClient";

export function useSections() {
  const fetchSections = async (courseId) => {
    try {
      const { data, error } = await supabase
        .from("course_sections")
        .select(`
          *,
          course_lessons (
            id,
            title,
            type,
            duration,
            is_preview,
            status,
            order_index
          )
        `)
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching sections:", error);
      return { data: null, error };
    }
  };

  const createSection = async (courseId, title, orderIndex = 0) => {
    try {
      const { data, error } = await supabase
        .from("course_sections")
        .insert({
          course_id: courseId,
          title: title,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error creating section:", error);
      return { data: null, error };
    }
  };

  const updateSection = async (id, data) => {
    try {
      const updates = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from("course_sections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: result, error: null };
    } catch (error) {
      console.error("Error updating section:", error);
      return { data: null, error };
    }
  };

  const deleteSection = async (id) => {
    try {
      const { error } = await supabase
        .from("course_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting section:", error);
      return { error };
    }
  };

  const reorderSections = async (sections) => {
    try {
      const updates = sections.map((section, index) => ({
        id: section.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from("course_sections")
        .upsert(updates);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error reordering sections:", error);
      return { error };
    }
  };

  return {
    fetchSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  };
}