import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, 
  FaTrash, 
  FaGripVertical, 
  FaCheckCircle, 
  FaTimes,
  FaLightbulb
} from "react-icons/fa";
import useLearningPoints from "../../hooks/useLearningPoints";

/**
 * WhatYouWillLearn Component
 * Dynamic learning outcomes editor with drag-and-drop support
 * 
 * @param {string} courseId - Course ID (optional for new courses)
 * @param {boolean} editable - Whether the component is editable
 * @param {Array} initialPoints - Initial learning points (for display mode)
 * @param {Function} onChange - Callback when points change
 * @param {Function} onSave - Callback when points are saved
 */
const WhatYouWillLearn = ({ 
  courseId = null, 
  editable = true, 
  initialPoints = [],
  onChange,
  onSave 
}) => {
  const { 
    fetchLearningPoints, 
    createLearningPoint, 
    updateLearningPoint, 
    deleteLearningPoint,
    loading 
  } = useLearningPoints();

  const [points, setPoints] = useState(initialPoints);
  const [newPoint, setNewPoint] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Load learning points when courseId changes
  useEffect(() => {
    if (courseId && editable) {
      loadLearningPoints();
    } else if (initialPoints.length > 0) {
      setPoints(initialPoints);
    }
  }, [courseId, editable]);

  const loadLearningPoints = async () => {
    const data = await fetchLearningPoints(courseId);
    if (data) {
      setPoints(data);
      if (onChange) onChange(data);
    }
  };

  const handleAddPoint = async () => {
    if (!newPoint.trim()) return;

    if (courseId) {
      // Save to database
      setAdding(true);
      const newLearningPoint = await createLearningPoint(courseId, newPoint.trim());
      
      if (newLearningPoint) {
        setPoints([...points, newLearningPoint]);
        setNewPoint("");
        setAdding(false);
        if (onChange) onChange([...points, newLearningPoint]);
        if (onSave) onSave();
      }
    } else {
      // Just add to local state (for new courses)
      const tempPoint = {
        id: `temp-${Date.now()}`,
        title: newPoint.trim(),
        description: "",
        order_index: points.length,
      };
      setPoints([...points, tempPoint]);
      setNewPoint("");
      if (onChange) onChange([...points, tempPoint]);
    }
  };

  const handleDeletePoint = async (id) => {
    if (courseId) {
      const success = await deleteLearningPoint(id);
      if (success) {
        setPoints(points.filter(p => p.id !== id));
        if (onChange) onChange(points.filter(p => p.id !== id));
        if (onSave) onSave();
      }
    } else {
      setPoints(points.filter(p => p.id !== id));
      if (onChange) onChange(points.filter(p => p.id !== id));
    }
  };

  const handleStartEdit = (point) => {
    setEditingId(point.id);
    setEditValue(point.title);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) return;

    if (courseId) {
      const success = await updateLearningPoint(editingId, { title: editValue.trim() });
      if (success) {
        setPoints(points.map(p => p.id === editingId ? { ...p, title: editValue.trim() } : p));
        setEditingId(null);
        setEditValue("");
        if (onChange) onChange(points.map(p => p.id === editingId ? { ...p, title: editValue.trim() } : p));
        if (onSave) onSave();
      }
    } else {
      setPoints(points.map(p => p.id === editingId ? { ...p, title: editValue.trim() } : p));
      setEditingId(null);
      setEditValue("");
      if (onChange) onChange(points.map(p => p.id === editingId ? { ...p, title: editValue.trim() } : p));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingId) {
        handleSaveEdit();
      } else {
        handleAddPoint();
      }
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Display mode (for students/course details)
  if (!editable) {
    return (
      <div className="space-y-3">
        {points.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 italic">
            No learning outcomes specified yet.
          </div>
        ) : (
          points.map((point, index) => (
            <motion.div
              key={point.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                <FaCheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-gray-900 dark:text-white">
                {point.title}
              </span>
            </motion.div>
          ))
        )}
      </div>
    );
  }

  // Edit mode (for instructors)
  return (
    <div className="space-y-4">
      {/* Learning Points List */}
      <div className="space-y-3">
        {loading && points.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : points.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <FaLightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No learning points added yet</p>
            <p className="text-sm">Add learning outcomes to help students understand what they'll gain</p>
          </div>
        ) : (
          points.map((point, index) => (
            <motion.div
              key={point.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400 cursor-grab">
                  <FaGripVertical className="w-5 h-5" />
                </div>

                {editingId === point.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <FaCheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="text-gray-900 dark:text-white">
                        {point.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(point)}
                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePoint(point.id)}
                        className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add New Point */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Add a learning outcome..."
          value={newPoint}
          onChange={(e) => setNewPoint(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleAddPoint}
          disabled={!newPoint.trim() || adding}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <FaPlus className="w-4 h-4" />
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Tips */}
      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <p className="font-medium mb-1 flex items-center gap-2">
          <FaLightbulb className="w-4 h-4" />
          Tips for effective learning outcomes:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-5">
          <li>Start with action verbs (e.g., "Learn", "Master", "Build")</li>
          <li>Be specific about what students will achieve</li>
          <li>Focus on tangible skills and knowledge</li>
          <li>Keep each point concise and clear</li>
          <li>Order points from most important to least important</li>
        </ul>
      </div>
    </div>
  );
};

export default WhatYouWillLearn;