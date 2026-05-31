/**
 * courseService.js - FIXED VERSION
 * ─────────────────────────────────────────────────────────────────
 * All Supabase queries related to courses, sections, and lessons.
 * Used by instructor dashboard pages. Every function returns
 * { data, error } so callers handle errors uniformly.
 * 
 * DATABASE SCHEMA: Uses `title` and `description` (NOT course_name!)
 * ─────────────────────────────────────────────────────────────────
 */
import { supabase } from "../config/supabaseClient";

// ── Course CRUD ────────────────────────────────────────────────────────────────

/** 
 * Fetch all courses belonging to the logged-in instructor.
 * 
 * COMPLETELY AVOIDS EMBEDDING ERRORS: Fetches categories separately, 
 * so no relationship conflicts at all!
 */
export async function getInstructorCourses(instructorId) {
  try {
    // Step 1: Fetch courses without embedding (no relationship errors!)
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        price,
        status,
        thumbnail,
        thumbnail_url,
        custom_thumbnail_url,
        final_thumbnail_url,
        thumbnail_source,
        tags,
        category_id,
        what_you_will_learn,
        instructions,
        created_at,
        updated_at,
        preview_video_url,
        youtube_video_url,
        youtube_video_id,
        youtube_embed_url,
        youtube_thumbnail_url,
        video_provider,
        preview_duration,
        preview_type,
        is_free,
        level
      `)
      .eq("instructor_id", instructorId)
      .order("created_at", { ascending: false });

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      return { data: [], error: coursesError };
    }

    if (!courses || courses.length === 0) {
      return { data: [], error: null };
    }

    // Step 2: Fetch ALL categories separately and create a lookup map
    const { data: allCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, slug");
    
    const categoryMap = {};
    if (!categoriesError && allCategories) {
      allCategories.forEach(cat => {
        categoryMap[cat.id] = cat;
      });
    }

    // Step 3: Fetch enrollment counts for all courses
    const courseIds = courses.map(c => c.id);
    const { data: enrollmentCounts, error: enrollError } = await supabase
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds);

    // If enrollments table doesn't exist or has errors, continue without counts
    const enrollmentMap = {};
    if (!enrollError && enrollmentCounts) {
      enrollmentCounts.forEach(e => {
        enrollmentMap[e.course_id] = (enrollmentMap[e.course_id] || 0) + 1;
      });
    }

    // Step 4: Enrich courses with category and enrollment data
    const enrichedCourses = courses.map(course => ({
      ...course,
      category: categoryMap[course.category_id] || null,
      enrollments: Array(enrollmentMap[course.id] || 0).fill({}), // Mock array for length
      enrollmentCount: enrollmentMap[course.id] || 0,
    }));

    return { data: enrichedCourses, error: null };
  } catch (err) {
    console.error("Unexpected error in getInstructorCourses:", err);
    return { data: [], error: err };
  }
}

/**
 * ADVANCED VERSION: Uses nested query (requires proper FK relationships).
 * Only use this after running fix_enrollments_relationship.sql
 * and verifying the schema cache has been refreshed.
 */
export async function getInstructorCoursesAdvanced(instructorId) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        price,
        status,
        thumbnail,
        tags,
        category_id,
        what_you_will_learn,
        instructions,
        created_at,
        updated_at,
        categories ( id, name ),
        enrollments ( id, user_id, created_at )
      `)
      .eq("instructor_id", instructorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error in advanced query:", error);
      // Fallback to stable version
      return getInstructorCourses(instructorId);
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    console.error("Unexpected error in advanced query:", err);
    // Fallback to stable version
    return getInstructorCourses(instructorId);
  }
}


/** Fetch a single course with full detail (sections + sub-sections). */
export async function getCourseById(courseId) {
  try {
    // Step 1: Fetch course without embedding categories
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        sections (
          id,
          section_name,
          order_index,
          sub_sections (
            id,
            title,
            description,
            video_url,
            time_duration,
            is_preview,
            order_index
          )
        ),
        enrollments ( id, user_id, created_at )
      `)
      .eq("id", courseId)
      .single();

    if (courseError) {
      console.error("Error fetching course by id:", courseError);
      return { data: null, error: courseError };
    }

    // Step 2: Fetch category separately if needed
    let category = null;
    if (course.category_id) {
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("id", course.category_id)
        .single();
      
      if (!categoryError && categoryData) {
        category = categoryData;
      }
    }

    return { data: { ...course, category }, error: null };
  } catch (err) {
    console.error("Unexpected error in getCourseById:", err);
    return { data: null, error: err };
  }
}

/** Create a new course draft and return the new row. */
export async function createCourse(instructorId, payload, status = "draft") {
  try {
    if (!instructorId) {
      return { data: null, error: new Error("Instructor ID is required to create a course") };
    }
    if (!payload || !(payload.title || payload.course_name)?.trim()) {
      return { data: null, error: new Error("Course title is required and cannot be empty") };
    }

    console.log("[createCourse] Creating course with payload:", payload);
    
    const validStatuses = ["draft", "pending", "published", "rejected", "archived"];
    const finalStatus = validStatuses.includes(status?.toLowerCase()) ? status?.toLowerCase() : "draft";
    
    const safeCourseData = {
      instructor_id:       instructorId,
      course_name:         (payload.title || payload.course_name || "").trim(),
      course_description:  (payload.description || payload.course_description || "").trim(),
      what_you_will_learn: Array.isArray(payload.what_you_will_learn) ? payload.what_you_will_learn.filter(Boolean) : [],
      requirements:        Array.isArray(payload.requirements) ? payload.requirements.filter(Boolean) : [],
      learning_outcomes:   Array.isArray(payload.learning_outcomes) ? payload.learning_outcomes.filter(Boolean) : [],
      target_audience:     Array.isArray(payload.target_audience) ? payload.target_audience.filter(Boolean) : [],
      instructions:        Array.isArray(payload.instructions) ? payload.instructions.filter(Boolean) : [],
      price:               Number(payload.price ?? 0),
      category_id:         payload.category_id ?? payload.category ?? null,
      department_id:       payload.department_id ?? null,
      semester:            payload.semester ?? null,
      subject_code:        payload.subject_code ?? null,
      slug:                payload.slug ?? null,
      is_free:             !!payload.is_free,
      tags:                Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
      status:              finalStatus,
      sold_count:          0,
      // Video preview fields (ALL requested fields)
      preview_video_url:   payload.preview_video_url ?? null,
      preview_video_id:    payload.preview_video_id ?? null,
      preview_video_thumbnail: payload.preview_video_thumbnail ?? payload.preview_thumbnail ?? null,
      preview_video_embed_url: payload.preview_video_embed_url ?? null,
      video_provider:      payload.video_provider ?? "youtube",
      preview_duration:    payload.preview_duration ?? payload.video_duration ?? null,
      preview_type:        payload.preview_type ?? "video",
    };
    
    console.log("[createCourse] Inserting safe course data:", safeCourseData);
    
    const response = await supabase
      .from("courses")
      .insert(safeCourseData)
      .select()
      .single();

    console.log("[createCourse] Supabase response:", response);

    if (!response || response.error) {
      console.error("[createCourse] Supabase Error:", response?.error);
      return {
        data: null,
        error: response?.error || new Error("Failed to insert course record"),
      };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error("[createCourse] Error:", error);
    return {
      data: null,
      error,
    };
  }
}

/** Update an existing course. Only the owner can update (enforced by RLS). */
export async function updateCourse(courseId, updates) {
  const finalUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  if ("tags" in updates) {
    finalUpdates.tags = Array.isArray(updates.tags) ? updates.tags.filter(Boolean) : [];
  }
  if ("instructions" in updates) {
    finalUpdates.instructions = Array.isArray(updates.instructions)
      ? updates.instructions.filter(Boolean)
      : [];
  }
  if ("what_you_will_learn" in updates) {
    finalUpdates.what_you_will_learn = Array.isArray(updates.what_you_will_learn)
      ? updates.what_you_will_learn.filter(Boolean)
      : [];
  }
  if ("requirements" in updates) {
    finalUpdates.requirements = Array.isArray(updates.requirements)
      ? updates.requirements.filter(Boolean)
      : [];
  }
  if ("learning_outcomes" in updates) {
    finalUpdates.learning_outcomes = Array.isArray(updates.learning_outcomes)
      ? updates.learning_outcomes.filter(Boolean)
      : [];
  }
  if ("target_audience" in updates) {
    finalUpdates.target_audience = Array.isArray(updates.target_audience)
      ? updates.target_audience.filter(Boolean)
      : [];
  }

  const { data, error } = await supabase
    .from("courses")
    .update(finalUpdates)
    .eq("id", courseId)
    .select()
    .single();

  return { data, error };
}

/** Publish or un-publish a course. */
export async function setCourseStatus(courseId, status) {
  return updateCourse(courseId, { status });
}

/** Publish a course (set status to published). */
export async function publishCourse(courseId) {
  const { data, error } = await supabase
    .from("courses")
    .update({
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .select()
    .single();

  return { data, error };
}

/** Delete a course. Cascades to sections + sub-sections via FK ON DELETE CASCADE. */
export async function deleteCourse(courseId) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  return { error };
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return { data: data ?? [], error };
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function addSection(courseId, sectionName, orderIndex = 0) {
  try {
    if (!courseId) {
      return { data: null, error: new Error("Course ID is required to create a section") };
    }
    if (!sectionName || !sectionName.trim()) {
      return { data: null, error: new Error("Section title is required and cannot be empty") };
    }

    const response = await supabase
      .from("sections")
      .insert({ 
        course_id: courseId, 
        section_name: sectionName.trim(), 
        order_index: Number(orderIndex || 0) 
      })
      .select()
      .single();

    console.log("[addSection] Response:", response);

    if (!response || response.error) {
      console.error("[addSection] Supabase Error:", response?.error);
      return { data: null, error: response?.error || new Error("Failed to insert section") };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error("[addSection] Error:", error);
    return { data: null, error };
  }
}

export async function updateSection(sectionId, updates) {
  try {
    const response = await supabase
      .from("sections")
      .update(updates)
      .eq("id", sectionId)
      .select()
      .single();

    if (!response || response.error) {
      return { data: null, error: response?.error || new Error("Failed to update section") };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error("[updateSection] Error:", error);
    return { data: null, error };
  }
}

export async function deleteSection(sectionId) {
  const { error } = await supabase.from("sections").delete().eq("id", sectionId);
  return { error };
}

// ── Sub-sections (Lessons) ────────────────────────────────────────────────────

export async function addLesson(sectionId, payload) {
  try {
    if (!sectionId) {
      return { data: null, error: new Error("Section ID is required to create a lesson") };
    }
    if (!payload || !payload.title || !payload.title.trim()) {
      return { data: null, error: new Error("Lesson title is required and cannot be empty") };
    }

    const response = await supabase
      .from("sub_sections")
      .insert({
        section_id:    sectionId,
        title:         payload.title.trim(),
        description:   payload.description?.trim() ?? "",
        video_url:     payload.video_url?.trim() ?? "",
        time_duration: String(payload.time_duration || "0"),
        is_preview:    !!payload.is_preview,
        order_index:   Number(payload.order_index || 0),
      })
      .select()
      .single();

    console.log("[addLesson] Response:", response);

    if (!response || response.error) {
      console.error("[addLesson] Supabase Error:", response?.error);
      return { data: null, error: response?.error || new Error("Failed to insert lesson") };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error("[addLesson] Error:", error);
    return { data: null, error };
  }
}

export async function updateLesson(lessonId, updates) {
  const { data, error } = await supabase
    .from("sub_sections")
    .update(updates)
    .eq("id", lessonId)
    .select()
    .single();

  return { data, error };
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase.from("sub_sections").delete().eq("id", lessonId);
  return { error };
}

// ── Analytics helpers ────────────────────────────────────────────────────────

/** Get enrollment count + enrolled student profiles for a course. */
export async function getCourseEnrollments(courseId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      profiles ( id, full_name, first_name, last_name, email, avatar_url )
    `)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

/** 
 * Aggregate stats for the instructor's dashboard header cards.
 * Uses safe queries with proper error handling to prevent dashboard crashes.
 */
export async function getInstructorStats(instructorId) {
  try {
    // 1. Fetch all courses for this instructor
    const { data: courses, error: courseErr } = await supabase
      .from("courses")
      .select("id, status, price, sold_count")
      .eq("instructor_id", instructorId);

    if (courseErr) {
      console.error("Error fetching courses for stats:", courseErr);
      return { 
        data: {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalEnrollments: 0,
          totalRevenue: 0,
        }, 
        error: courseErr 
      };
    }

    const courseList = courses ?? [];
    const courseIds = courseList.map(c => c.id);

    // 2. Calculate basic course stats (case-insensitive)
    const totalCourses = courseList.length;
    const publishedCourses = courseList.filter(c => (c.status || "").toLowerCase() === "published").length;
    const draftCourses = courseList.filter(c => (c.status || "").toLowerCase() === "draft").length;

    // 3. Fetch enrollment count safely
    let totalEnrollments = 0;
    if (courseIds.length > 0) {
      try {
        const { count, error: enrollError } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .in("course_id", courseIds);

        if (!enrollError && count !== null) {
          totalEnrollments = count;
        }
      } catch (err) {
        console.warn("Could not fetch enrollments (table may not exist):", err);
        totalEnrollments = 0;
      }
    }

    // 4. Calculate revenue (based on sold_count from courses table)
    const totalRevenue = courseList.reduce(
      (sum, course) => sum + (Number(course.price) || 0) * (Number(course.sold_count) || 0),
      0
    );

    return {
      data: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        totalRevenue,
      },
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error in getInstructorStats:", err);
    return {
      data: {
        totalCourses: 0,
        publishedCourses: 0,
        draftCourses: 0,
        totalEnrollments: 0,
        totalRevenue: 0,
      },
      error: err,
    };
  }
}
