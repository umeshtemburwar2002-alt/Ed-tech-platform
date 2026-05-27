import { supabase } from "../config/supabaseClient";

export function useCourses() {
  const fetchInstructorCourses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          departments (id, name),
          categories (id, name)
        `)
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching instructor courses:", error);
      return { data: null, error };
    }
  };

  const createCourse = async (data) => {
    try {
      const safeData = {
        title: data.title || "",
        subtitle: data.subtitle || "",
        short_description: data.short_description || "",
        description: data.description || "",
        language: data.language || "English",
        level: data.level || "Beginner",
        slug: data.slug || "",
        tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
        thumbnail_url: data.thumbnail_url || null,
        price: data.price ?? 0,
        discount_price: data.discount_price ?? 0,
        discounted_price: data.discounted_price ?? 0,
        is_free: data.is_free ?? false,
        pricing_type: data.pricing_type || "one-time",
        currency: data.currency || "INR",
        total_lessons: 0,
        total_sections: 0,
        total_duration: 0,
        duration: data.duration || 0,
        enrolled_students_count: 0,
        learning_outcomes: Array.isArray(data.learning_outcomes) ? data.learning_outcomes.filter(Boolean) : [],
        what_you_will_learn: Array.isArray(data.what_you_will_learn) ? data.what_you_will_learn.filter(Boolean) : [],
        requirements: Array.isArray(data.requirements) ? data.requirements.filter(Boolean) : [],
        target_audience: Array.isArray(data.target_audience) ? data.target_audience.filter(Boolean) : [],
        instructions: Array.isArray(data.instructions) ? data.instructions.filter(Boolean) : [],
        status: data.status || "draft",
        visibility: data.visibility || "private",
        certificate_enabled: data.certificate_enabled ?? true,
        featured: false,
        seo_title: data.seo_title || "",
        seo_description: data.seo_description || "",
        department_id: data.department_id || null,
        semester: data.semester ? parseInt(data.semester) : null,
        subject_code: data.subject_code || "",
        category_id: data.category_id || null,
        subcategory: data.subcategory || "",
        preview_video: data.preview_video || null,
        instructor_id: data.instructor_id,
      };

      const { data: result, error } = await supabase
        .from("courses")
        .insert(safeData)
        .select()
        .single();

      if (error) throw error;
      return { data: result, error: null };
    } catch (error) {
      console.error("Error creating course:", error);
      return { data: null, error };
    }
  };

  const updateCourse = async (id, data) => {
    try {
      const updates = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Handle array fields
      if ("tags" in updates) {
        updates.tags = Array.isArray(updates.tags) ? updates.tags.filter(Boolean) : [];
      }
      if ("learning_outcomes" in updates) {
        updates.learning_outcomes = Array.isArray(updates.learning_outcomes) ? updates.learning_outcomes.filter(Boolean) : [];
      }
      if ("what_you_will_learn" in updates) {
        updates.what_you_will_learn = Array.isArray(updates.what_you_will_learn) ? updates.what_you_will_learn.filter(Boolean) : [];
      }
      if ("requirements" in updates) {
        updates.requirements = Array.isArray(updates.requirements) ? updates.requirements.filter(Boolean) : [];
      }
      if ("target_audience" in updates) {
        updates.target_audience = Array.isArray(updates.target_audience) ? updates.target_audience.filter(Boolean) : [];
      }
      if ("instructions" in updates) {
        updates.instructions = Array.isArray(updates.instructions) ? updates.instructions.filter(Boolean) : [];
      }

      const { data: result, error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: result, error: null };
    } catch (error) {
      console.error("Error updating course:", error);
      return { data: null, error };
    }
  };

  const deleteCourse = async (id) => {
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting course:", error);
      return { error };
    }
  };

  const duplicateCourse = async (id) => {
    try {
      const { data: original, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error("Course not found");

      const duplicateData = {
        ...original,
        id: undefined,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        status: "draft",
        total_lessons: 0,
        total_sections: 0,
        enrolled_students_count: 0,
        sold_count: 0,
        total_reviews: 0,
        created_at: undefined,
        updated_at: undefined,
        published_at: null,
      };

      const { data: result, error: insertError } = await supabase
        .from("courses")
        .insert(duplicateData)
        .select()
        .single();

      if (insertError) throw insertError;
      return { data: result, error: null };
    } catch (error) {
      console.error("Error duplicating course:", error);
      return { data: null, error };
    }
  };

  const publishCourse = async (id) => {
    return updateCourse(id, { status: "pending" });
  };

  const searchCourses = async (query, userId) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          departments (id, name),
          categories (id, name)
        `)
        .eq("instructor_id", userId)
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error searching courses:", error);
      return { data: null, error };
    }
  };

  const getCourseById = async (id) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          departments (id, name),
          categories (id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching course:", error);
      return { data: null, error };
    }
  };

  return {
    fetchInstructorCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    duplicateCourse,
    publishCourse,
    searchCourses,
    getCourseById,
  };
}