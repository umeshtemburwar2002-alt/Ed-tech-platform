import { useState } from "react";
import { supabase } from "../config/supabaseClient";
import toast from "react-hot-toast";

/**
 * Hook for managing course learning points (What You'll Learn)
 * Handles CRUD operations for learning points in the database
 */
const useLearningPoints = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch learning points for a course
  const fetchLearningPoints = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("course_learning_points")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err.message);
      toast.error("Failed to fetch learning points");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create a new learning point
  const createLearningPoint = async (courseId, title, description = "") => {
    setLoading(true);
    setError(null);
    try {
      // Get current max order_index
      const { data: existingPoints } = await supabase
        .from("course_learning_points")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = existingPoints && existingPoints.length > 0 
        ? existingPoints[0].order_index + 1 
        : 0;

      const { data, error } = await supabase
        .from("course_learning_points")
        .insert({
          course_id: courseId,
          title,
          description,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Learning point added");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to add learning point");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a learning point
  const updateLearningPoint = async (pointId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("course_learning_points")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pointId)
        .select()
        .single();

      if (error) throw error;
      toast.success("Learning point updated");
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to update learning point");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a learning point
  const deleteLearningPoint = async (pointId) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("course_learning_points")
        .delete()
        .eq("id", pointId);

      if (error) throw error;
      toast.success("Learning point deleted");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to delete learning point");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Batch create learning points
  const batchCreateLearningPoints = async (courseId, titles) => {
    setLoading(true);
    setError(null);
    try {
      const points = titles.map((title, index) => ({
        course_id: courseId,
        title: title.trim(),
        description: "",
        order_index: index,
      }));

      const { data, error } = await supabase
        .from("course_learning_points")
        .insert(points)
        .select();

      if (error) throw error;
      toast.success(`${titles.length} learning points added`);
      return data;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to add learning points");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Reorder learning points
  const reorderLearningPoints = async (orderedIds) => {
    setLoading(true);
    setError(null);
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      const { error } = await supabase
        .from("course_learning_points")
        .upsert(updates);

      if (error) throw error;
      toast.success("Learning points reordered");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error("Failed to reorder learning points");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchLearningPoints,
    createLearningPoint,
    updateLearningPoint,
    deleteLearningPoint,
    batchCreateLearningPoints,
    reorderLearningPoints,
  };
};

export default useLearningPoints;