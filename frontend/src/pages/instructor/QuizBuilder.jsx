import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaPlus, FaTrash, FaEdit, FaSave, FaCheckCircle, FaTimes, FaRegClock, FaStar, FaPlay, FaCopy, FaList, FaEdit as FaEditIcon, FaTrashAlt, FaSave as FaSaveIcon } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const QuizBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});

  // Quiz form
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    passing_score: 70,
    time_limit: null,
    max_attempts: 1,
    show_results: true,
    randomize_order: false,
  });

  // Question form
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "single_choice",
    options: ["", "", "", ""],
    correct_answer: null,
    points: 1,
    explanation: "",
    image_url: "",
  });

  // Fetch quizzes for course
  const fetchQuizzes = async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const { data, error } = await fetch(`/api/quizzes?course_id=${courseId}`);
      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [courseId]);

  // Fetch questions for quiz
  const fetchQuestions = async (quizId) => {
    try {
      const { data, error } = await fetch(`/api/quiz-questions?quiz_id=${quizId}`);
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  // Create quiz
  const handleCreateQuiz = async () => {
    if (!quizForm.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quizForm,
          course_id: courseId,
          status: "draft",
        }),
      });

      if (error) throw error;
      
      setQuizzes([...quizzes, data]);
      setSelectedQuiz(data);
      setQuizForm({ ...quizForm, title: "", description: "" });
      toast.success("Quiz created successfully");
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Failed to create quiz");
    } finally {
      setSaving(false);
    }
  };

  // Update quiz
  const handleUpdateQuiz = async () => {
    if (!selectedQuiz) return;

    setSaving(true);
    try {
      const { error } = await fetch(`/api/quizzes/${selectedQuiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizForm),
      });

      if (error) throw error;
      
      toast.success("Quiz updated successfully");
    } catch (error) {
      console.error("Error updating quiz:", error);
      toast.error("Failed to update quiz");
    } finally {
      setSaving(false);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      const { error } = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (error) throw error;
      
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
      toast.success("Quiz deleted");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  // Add question
  const handleAddQuestion = async () => {
    if (!selectedQuiz || !questionForm.question_text.trim()) {
      toast.error("Question text is required");
      return;
    }

    try {
      const { data, error } = await fetch("/api/quiz-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionForm,
          quiz_id: selectedQuiz.id,
          order_index: questions.length,
        }),
      });

      if (error) throw error;
      
      setQuestions([...questions, data]);
      setQuestionForm({
        question_text: "",
        question_type: "single_choice",
        options: ["", "", "", ""],
        correct_answer: null,
        points: 1,
        explanation: "",
        image_url: "",
      });
      toast.success("Question added successfully");
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Failed to add question");
    }
  };

  // Update question
  const handleUpdateQuestion = async (questionId, updates) => {
    try {
      const { error } = await fetch(`/api/quiz-questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (error) throw error;
      
      setQuestions(questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
      toast.success("Question updated");
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await fetch(`/api/quiz-questions/${questionId}`, {
        method: "DELETE",
      });

      if (error) throw error;
      
      setQuestions(questions.filter((q) => q.id !== questionId));
      toast.success("Question deleted");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  // Update question option
  const updateOption = (index, value) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  };

  // Calculate quiz stats
  const calculateQuizStats = (quiz) => {
    return {
      totalQuestions: quiz.question_count || 0,
      totalTime: quiz.time_limit ? `${quiz.time_limit} min` : "Unlimited",
      passingScore: quiz.passing_score,
      attempts: quiz.attempts_count || 0,
    };
  };

  // Preview quiz
  const startPreview = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setPreviewMode(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const selectAnswer = (questionId, answer) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitPreview = () => {
    let correct = 0;
    questions.forEach((question) => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer === question.correct_answer) {
        correct++;
      }
    });
    
    const score = (correct / questions.length) * 100;
    toast.success(`Preview score: ${score.toFixed(0)}% (${correct}/${questions.length} correct)`);
    setPreviewMode(false);
  };

  // Get question type label
  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "single_choice":
        return "Single Choice";
      case "multiple_choice":
        return "Multiple Choice";
      case "true_false":
        return "True/False";
      case "short_answer":
        return "Short Answer";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Quiz Builder
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage quizzes for your course
            </p>
          </div>
          {!previewMode && (
            <button
              onClick={() => navigate(`/instructor/courses/${courseId}`)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Course
            </button>
          )}
        </div>

        {!previewMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Quiz List */}
            <div className="lg:col-span-1 space-y-4">
              {/* Create New Quiz */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Create New Quiz
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="Quiz title"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder="Quiz description"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
                      placeholder="Passing score %"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      value={quizForm.time_limit || ""}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Time limit (min)"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleCreateQuiz}
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaPlus /> {saving ? "Creating..." : "Create Quiz"}
                  </button>
                </div>
              </motion.div>

              {/* Quiz List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quizzes ({quizzes.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        fetchQuestions(quiz.id);
                      }}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedQuiz?.id === quiz.id ? "bg-blue-50 dark:bg-blue-900/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {quiz.question_count || 0} questions
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(quiz.id);
                            }}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quizzes.length === 0 && (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      <p>No quizzes created yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Panel - Question Editor */}
            <div className="lg:col-span-2 space-y-6">
              {selectedQuiz ? (
                <>
                  {/* Quiz Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedQuiz.title}
                      </h2>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateQuiz}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                        >
                          <FaSaveIcon /> {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={startPreview}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaPlay /> Preview
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Passing Score (%)
                        </label>
                        <input
                          type="number"
                          value={selectedQuiz.passing_score}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, passing_score: parseInt(e.target.value) })}
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Time Limit (min)
                        </label>
                        <input
                          type="number"
                          value={selectedQuiz.time_limit || ""}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, time_limit: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Attempts
                        </label>
                        <input
                          type="number"
                          value={selectedQuiz.max_attempts}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, max_attempts: parseInt(e.target.value) })}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-6">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Randomize Order
                        </label>
                        <button
                          onClick={() => setSelectedQuiz({ ...selectedQuiz, randomize_order: !selectedQuiz.randomize_order })}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            selectedQuiz.randomize_order ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block w-6 h-6 rounded-full bg-white transition-transform ${
                              selectedQuiz.randomize_order ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Questions List */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Questions ({questions.length})
                      </h2>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      <AnimatePresence>
                        {questions.map((question, index) => (
                          <motion.div
                            key={question.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                      {question.question_text}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {getQuestionTypeLabel(question.question_type)} • {question.points} points
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleDeleteQuestion(question.id)}
                                      className="p-2 text-red-500 hover:text-red-700"
                                    >
                                      <FaTrashAlt />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {questions.length === 0 && (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                          <p>No questions added yet</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Add Question Form */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Add Question
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Question Type
                        </label>
                        <select
                          value={questionForm.question_type}
                          onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="single_choice">Single Choice</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True/False</option>
                          <option value="short_answer">Short Answer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Question
                        </label>
                        <ReactQuill
                          value={questionForm.question_text}
                          onChange={(value) => setQuestionForm({ ...questionForm, question_text: value })}
                          theme="snow"
                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter your question..."
                        />
                      </div>

                      {(questionForm.question_type === "single_choice" ||
                        questionForm.question_type === "multiple_choice") && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {questionForm.options.map((option, index) => (
                              <div key={index} className="flex gap-2">
                                <button
                                  onClick={() => setQuestionForm({ ...questionForm, correct_answer: index })}
                                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                    questionForm.correct_answer === index
                                      ? "border-blue-500 bg-blue-50 text-blue-600"
                                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  <FaCheckCircle className="w-5 h-5" />
                                </button>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(index, e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder={`Option ${index + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {questionForm.question_type === "true_false" && (
                        <div className="flex gap-4">
                          <button
                            onClick={() => setQuestionForm({ ...questionForm, correct_answer: "true" })}
                            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
                              questionForm.correct_answer === "true"
                                ? "border-blue-500 bg-blue-50 text-blue-600"
                                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            True
                          </button>
                          <button
                            onClick={() => setQuestionForm({ ...questionForm, correct_answer: "false" })}
                            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
                              questionForm.correct_answer === "false"
                                ? "border-blue-500 bg-blue-50 text-blue-600"
                                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            False
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Points
                          </label>
                          <input
                            type="number"
                            value={questionForm.points}
                            onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleAddQuestion}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FaPlus /> Add Question
                      </button>
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                  <FaList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Quiz Selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a quiz or create a new one to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
            >
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedQuiz?.title}</h2>
                    <p className="text-blue-100 mt-1">
                      {selectedQuiz?.question_count || questions.length} Questions
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
                {selectedQuiz?.time_limit && (
                  <div className="flex items-center gap-2 mt-4 text-blue-100">
                    <FaRegClock />
                    <span>{selectedQuiz.time_limit} minutes</span>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="p-6 space-y-8">
                {questions.map((question, index) => (
                  <div key={question.id} className="border-b border-gray-200 dark:border-gray-700 pb-8">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium text-lg">
                          {question.question_text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {question.points} points
                        </p>
                      </div>
                    </div>

                    <div className="ml-11 space-y-2">
                      {question.question_type === "true_false" ? (
                        <>
                          <button
                            onClick={() => selectAnswer(question.id, "true")}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                              userAnswers[question.id] === "true"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            True
                          </button>
                          <button
                            onClick={() => selectAnswer(question.id, "false")}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                              userAnswers[question.id] === "false"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            False
                          </button>
                        </>
                      ) : (
                        question.options?.map((option, optIndex) => (
                          <button
                            key={optIndex}
                            onClick={() => selectAnswer(question.id, optIndex)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                              userAnswers[question.id] === optIndex
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            {option}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPreview}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizBuilder;