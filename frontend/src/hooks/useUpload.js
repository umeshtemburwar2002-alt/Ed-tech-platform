import { supabase } from "../config/supabaseClient";

export function useUpload() {
  const uploadFile = async (bucket, path, file, onProgress) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            if (onProgress) {
              onProgress(percentage, progress.loaded, progress.total);
            }
          },
        });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { data: null, error };
    }
  };

  const uploadVideo = async (file, path, onProgress) => {
    return uploadFile("lesson-videos", path, file, onProgress);
  };

  const uploadPDF = async (file, path) => {
    const { data, error } = await uploadFile("lesson-pdfs", path, file);
    if (error) return { data: null, error };

    // Get public URL
    const { data: { publicUrl } } = await supabase.storage
      .from("lesson-pdfs")
      .getPublicUrl(path);

    return { data: { ...data, publicUrl }, error: null };
  };

  const uploadThumbnail = async (file, courseId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const instructorId = session?.user?.id;
      if (!instructorId) {
        return { data: null, error: new Error("Instructor is not authenticated") };
      }

      const ext  = file.name.split(".").pop();
      // Conforms perfectly to the 3-level folder ownership check: auth.uid()/course/courseId/thumbnail_timestamp.ext
      const path = `${instructorId}/course/${courseId}/thumbnail_${Date.now()}.${ext}`;
      
      const { data, error } = await uploadFile("course-thumbnails", path, file);
      if (error) return { data: null, error };

      // Get public URL and update course
      const { data: { publicUrl } } = await supabase.storage
        .from("course-thumbnails")
        .getPublicUrl(path);

      // Update all thumbnail fields to satisfy dynamic resolver states
      const { error: updateError } = await supabase
        .from("courses")
        .update({ 
          thumbnail_url: publicUrl,
          thumbnail: publicUrl,
          custom_thumbnail_url: publicUrl,
          thumbnail_source: 'custom'
        })
        .eq("id", courseId);

      if (updateError) {
        return { data: { publicUrl }, error: updateError };
      }

      return { data: { publicUrl }, error: null };
    } catch (err) {
      console.error("uploadThumbnail hook error:", err);
      return { data: null, error: err };
    }
  };

  const uploadResource = async (file, lessonId) => {
    const path = `${lessonId}/${file.name}`;
    return uploadFile("lesson-resources", path, file);
  };

  const uploadAssignment = async (file, assignmentId) => {
    const path = `${assignmentId}/${file.name}`;
    return uploadFile("assignment-files", path, file);
  };

  const uploadAvatar = async (file, userId) => {
    const path = `${userId}/${file.name}`;
    const { data, error } = await uploadFile("user-avatars", path, file);
    if (error) return { data: null, error };

    // Get public URL
    const { data: { publicUrl } } = await supabase.storage
      .from("user-avatars")
      .getPublicUrl(path);

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      return { data: { publicUrl }, error: updateError };
    }

    return { data: { publicUrl }, error: null };
  };

  const deleteFile = async (bucket, path) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { error };
    }
  };

  const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return { data: null, error };
    }
  };

  const getPublicUrl = (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  };

  return {
    uploadFile,
    uploadVideo,
    uploadPDF,
    uploadThumbnail,
    uploadResource,
    uploadAssignment,
    uploadAvatar,
    deleteFile,
    getSignedUrl,
    getPublicUrl,
  };
}