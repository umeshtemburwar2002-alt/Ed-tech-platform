import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { useCourses } from "../hooks/useCourses";
import { useUpload } from "../hooks/useUpload";
import useLearningPoints from "../hooks/useLearningPoints";
import useCourseContent from "../hooks/useCourseContent";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useDropzone } from "react-dropzone";
import WhatYouWillLearn from "../components/course/WhatYouWillLearn";
import CourseContent from "../components/course/CourseContent";
import {
  FaUpload,
  FaEye,
  FaSave,
  FaArrowRight,
  FaPlus,
  FaTrash,
  FaGripVertical,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

// Zod validation schema
const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subtitle: z.string().optional(),
  short_description: z.string().max(150, "Short description must be less than 150 characters").optional(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  department_id: z.string().uuid("Please select a department").optional(),
  category_id: z.string().uuid("Please select a category").optional(),
  subject_code: z.string().optional(),
  semester: z.number().int().min(1).max(8).optional(),
  subcategory: z.string().optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  language: z.string(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
  pricing_type: z.enum(["free", "paid"]),
  price: z.number().nonnegative().optional(),
  discount: z.number().min(0).max(100).optional(),
  currency: z.string().default("INR"),
  learning_outcomes: z.array(z.string()),
  requirements: z.array(z.string()),
  target_audience: z.array(z.string()),
  instructions: z.array(z.string()),
  seo_title: z.string().max(60, "SEO title must be less than 60 characters").optional(),
  seo_description: z.string().max(160, "SEO description must be less than 160 characters").optional(),
  visibility: z.enum(["public", "private", "unlisted"]),
  certificate_enabled: z.boolean(),
  preview_video_url: z.string().url().optional().or(z.literal("")),
});

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  const { createCourse, updateCourse } = useCourses();
  const { uploadThumbnail, uploadVideo } = useUpload();
  const { batchCreateLearningPoints } = useLearningPoints();
  const { fetchCourseContent } = useCourseContent();
  
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [previewVideoFile, setPreviewVideoFile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [existingCourseId, setExistingCourseId] = useState(null);
  const [wordCount, setWordCount] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    short_description: "",
    description: "",
    department_id: "",
    category_id: "",
    subject_code: "",
    semester: "",
    subcategory: "",
    level: "Beginner",
    language: "English",
    tags: [],
    pricing_type: "free",
    price: "",
    discount: "",
    currency: "INR",
    learning_outcomes: [],
    requirements: [],
    target_audience: [],
    instructions: [],
    seo_title: "",
    seo_description: "",
    visibility: "private",
    certificate_enabled: true,
    preview_video_url: "",
  });

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now().toString(36);
  };

  const slug = formData.title ? generateSlug(formData.title) : "";

  // Check completion
  const checkCompletion = () => {
    const required = [
      formData.title,
      formData.short_description,
      formData.description,
      formData.department_id,
      formData.category_id,
      formData.level,
      formData.language,
      thumbnailPreview,
    ];
    const filled = required.filter(Boolean).length;
    return (filled / 8) * 100;
  };

  const completionPercentage = checkCompletion();

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await fetch("/api/departments");
        if (!error && data) setDepartments(data);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch categories when department changes
  useEffect(() => {
    if (formData.department_id) {
      const fetchCategories = async () => {
        try {
          const { data, error } = await fetch(`/api/categories?department_id=${formData.department_id}`);
          if (!error && data) setCategories(data);
        } catch (error) {
          console.error("Error fetching categories:", error);
        }
      };
      fetchCategories();
    }
  }, [formData.department_id]);

  // Word count for description
  useEffect(() => {
    const words = formData.description.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [formData.description]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title) {
        handleAutoSave();
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleAutoSave = async () => {
    setAutoSaving(true);
    try {
      const courseData = {
        ...formData,
        instructor_id: user?.id,
        thumbnail_url: thumbnailPreview,
        preview_video: formData.preview_video_url,
        status: "draft",
      };

      if (existingCourseId) {
        await updateCourse(existingCourseId, courseData);
        toast.success("Draft auto-saved");
      } else {
        const { data } = await createCourse(courseData);
        if (data) {
          setExistingCourseId(data.id);
          toast.success("Draft auto-saved");
        }
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Thumbnail upload
  const { getRootProps: getThumbnailRootProps, getInputProps: getThumbnailInputProps } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setThumbnailFile(acceptedFiles[0]);
        const preview = URL.createObjectURL(acceptedFiles[0]);
        setThumbnailPreview(preview);
      }
    },
  });

  // Preview video upload
  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    accept: { "video/*": [".mp4", ".webm", ".mov"] },
    maxFiles: 1,
    maxSize: 2147483648, // 2GB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setPreviewVideoFile(acceptedFiles[0]);
        toast.success("Video uploaded successfully");
      }
    },
  });

  // Add item to array fields
  const addArrayItem = (field, value = "") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value],
    }));
  };

  // Update array item
  const updateArrayItem = (field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  // Remove array item
  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Add tag
  const addTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      if (formData.tags.length < 10 && !formData.tags.includes(e.target.value.trim())) {
        addArrayItem("tags", e.target.value.trim());
        e.target.value = "";
      }
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = () => {
    if (formData.pricing_type === "paid" && formData.price && formData.discount) {
      const price = parseFloat(formData.price);
      const discount = parseFloat(formData.discount);
      return Math.round(price - (price * discount / 100));
    }
    return formData.price;
  };

  const discountedPrice = calculateDiscountedPrice();

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const courseData = {
        ...formData,
        instructor_id: user?.id,
        thumbnail_url: thumbnailPreview,
        preview_video: formData.preview_video_url,
        price: formData.pricing_type === "free" ? 0 : parseFloat(formData.price) || 0,
        discounted_price: discountedPrice,
        status: "draft",
      };

      let courseId;
      if (existingCourseId) {
        const result = await updateCourse(existingCourseId, courseData);
        if (result.error) throw result.error;
        courseId = existingCourseId;
      } else {
        const result = await createCourse(courseData);
        if (result.error) throw result.error;
        if (result.data) {
          setExistingCourseId(result.data.id);
          courseId = result.data.id;
        }
      }

      // Save learning points to database
      if (courseId && formData.learning_outcomes.length > 0) {
        await batchCreateLearningPoints(courseId, formData.learning_outcomes);
      }

      toast.success("Course saved as draft");
    } catch (error) {
      console.error("Save draft error:", error);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  // Proceed to builder
  const handleProceedToBuilder = async () => {
    if (completionPercentage < 100) {
      toast.error("Please complete all required fields first");
      return;
    }

    setSaving(true);
    try {
      const courseData = {
        ...formData,
        instructor_id: user?.id,
        thumbnail_url: thumbnailPreview,
        preview_video: formData.preview_video_url,
        price: formData.pricing_type === "free" ? 0 : parseFloat(formData.price) || 0,
        discounted_price: discountedPrice,
        status: "draft",
      };

      let courseId;
      if (existingCourseId) {
        const result = await updateCourse(existingCourseId, courseData);
        if (result.error) throw result.error;
        courseId = existingCourseId;
      } else {
        const result = await createCourse(courseData);
        if (result.error) throw result.error;
        if (result.data) {
          setExistingCourseId(result.data.id);
          courseId = result.data.id;
        }
      }

      // Save learning points to database
      if (courseId && formData.learning_outcomes.length > 0) {
        await batchCreateLearningPoints(courseId, formData.learning_outcomes);
      }
      
      navigate(`/instructor/courses/${courseId}/builder`);
    } catch (error) {
      console.error("Error proceeding to builder:", error);
      toast.error("Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  // Update field
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  className="bg-blue-600 h-2 rounded-full"
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(completionPercentage)}% Complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              {autoSaving && (
                <span className="text-sm text-gray-500">Auto-saving...</span>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                <FaSave className="w-4 h-4" />
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Section 1: Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Basic Information
              </h2>

              {/* Thumbnail */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Thumbnail *
                </label>
                <div {...getThumbnailRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors">
                  <input {...getThumbnailInputProps()} />
                  <div className="flex flex-col items-center justify-center">
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setThumbnailPreview(null);
                            setThumbnailFile(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FaUpload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Drag & drop or click to upload
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          PNG, JPG, WEBP up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter course title"
                />
                {slug && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Slug: {slug}
                  </p>
                )}
              </div>

              {/* Subtitle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter subtitle"
                />
              </div>

              {/* Short Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Short Description *
                </label>
                <textarea
                  value={formData.short_description}
                  onChange={(e) => updateField("short_description", e.target.value)}
                  maxLength={150}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Brief description (max 150 characters)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
                  {formData.short_description.length}/150
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description * <span className="text-xs text-gray-500">({wordCount} words)</span>
                </label>
                <ReactQuill
                  value={formData.description}
                  onChange={(value) => updateField("description", value)}
                  theme="snow"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Detailed course description..."
                />
              </div>
            </motion.div>

            {/* Section 2: Organization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Organization
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department *
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => updateField("department_id", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => updateField("category_id", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={formData.subject_code}
                    onChange={(e) => updateField("subject_code", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g. CS301"
                  />
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => updateField("semester", e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => updateField("subcategory", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g. Web Development, Data Science"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => updateField("level", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language *
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => updateField("language", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags <span className="text-xs text-gray-500">(type + Enter, max 10)</span>
                  </label>
                  <input
                    type="text"
                    onKeyPress={addTag}
                    placeholder="Add tag and press Enter"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => removeArrayItem("tags", index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Section 3: Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Pricing
              </h2>

              {/* Pricing Type Toggle */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => updateField("pricing_type", "free")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    formData.pricing_type === "free"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => updateField("pricing_type", "paid")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    formData.pricing_type === "paid"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  Paid
                </button>
              </div>

              {formData.pricing_type === "paid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount}
                      onChange={(e) => updateField("discount", e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Discount percentage"
                    />
                  </div>
                </div>
              )}

              {formData.pricing_type === "paid" && discountedPrice !== formData.price && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-green-700 dark:text-green-300">
                    Final Price: ₹{discountedPrice}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Section 4: Learning Outcomes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  What You'll Learn
                </h2>
                
                <WhatYouWillLearn
                  courseId={existingCourseId || null}
                  editable={true}
                  initialPoints={formData.learning_outcomes.map((outcome, index) => ({
                    id: `temp-${index}`,
                    title: outcome,
                    description: "",
                    order_index: index,
                  }))}
                  onChange={(points) => {
                    setFormData(prev => ({
                      ...prev,
                      learning_outcomes: points.map(p => p.title)
                    }));
                  }}
                  onSave={async () => {
                    if (existingCourseId) {
                      // Data is already saved by the component
                    }
                  }}
                />
              </div>
            </motion.div>

            {/* Section 5: Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Requirements
                </h2>
                <button
                  onClick={() => addArrayItem("requirements")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="flex gap-2">
                    <FaGripVertical className="w-5 h-5 text-gray-400 mt-2" />
                    <input
                      type="text"
                      value={requirement}
                      onChange={(e) => updateArrayItem("requirements", index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g. Basic knowledge of HTML/CSS"
                    />
                    <button
                      onClick={() => removeArrayItem("requirements", index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Section 6: Target Audience */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Target Audience
                </h2>
                <button
                  onClick={() => addArrayItem("target_audience")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.target_audience.map((audience, index) => (
                  <div key={index} className="flex gap-2">
                    <FaGripVertical className="w-5 h-5 text-gray-400 mt-2" />
                    <input
                      type="text"
                      value={audience}
                      onChange={(e) => updateArrayItem("target_audience", index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g. Beginners in programming"
                    />
                    <button
                      onClick={() => removeArrayItem("target_audience", index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Section 7: Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Instructions (shown before enrollment)
                </h2>
                <button
                  onClick={() => addArrayItem("instructions")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <FaGripVertical className="w-5 h-5 text-gray-400 mt-2" />
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => updateArrayItem("instructions", index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g. Complete the prerequisites first"
                    />
                    <button
                      onClick={() => removeArrayItem("instructions", index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Section 8: SEO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                SEO Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) => updateField("seo_title", e.target.value)}
                    maxLength={60}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="SEO-optimized title"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
                    {formData.seo_title.length}/60
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO Description
                  </label>
                  <textarea
                    value={formData.seo_description}
                    onChange={(e) => updateField("seo_description", e.target.value)}
                    maxLength={160}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="SEO-optimized description"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
                    {formData.seo_description.length}/160
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Section 9: Visibility & Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Visibility & Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Visibility
                  </label>
                  <div className="flex gap-4">
                    {["public", "private", "unlisted"].map((visibility) => (
                      <label key={visibility} className="flex items-center gap-2">
                        <input
                          type="radio"
                          value={visibility}
                          checked={formData.visibility === visibility}
                          onChange={(e) => updateField("visibility", e.target.value)}
                          className="text-blue-600"
                        />
                        <span className="capitalize text-gray-700 dark:text-gray-300">{visibility}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Certificate
                  </label>
                  <button
                    onClick={() => updateField("certificate_enabled", !formData.certificate_enabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.certificate_enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block w-6 h-6 rounded-full bg-white transition-transform ${
                        formData.certificate_enabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Section 10: Preview Video */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Preview Video
              </h2>

              <div {...getVideoRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors">
                <input {...getVideoInputProps()} />
                <div className="flex flex-col items-center justify-center">
                  {previewVideoFile ? (
                    <div className="text-center">
                      <FaCheckCircle className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">
                        {previewVideoFile.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <FaUpload className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Drag & drop or click to upload preview video
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        MP4, WEBM, MOV up to 2GB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Section 11: Course Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Course Content
              </h2>
              
              {existingCourseId ? (
                <CourseContent
                  courseId={existingCourseId}
                  editable={true}
                  onLessonClick={(lesson) => console.log("Lesson clicked:", lesson)}
                  onSectionEdit={(section) => console.log("Section edit:", section)}
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-500 dark:text-gray-400">
                    Save the course first to add course content (sections and lessons)
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Course content includes sections, lessons, videos, and learning materials
                  </p>
                </div>
              )}
            </motion.div>

            {/* Bottom Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors"
              >
                <FaSave className="w-5 h-5 mr-2" />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={handleProceedToBuilder}
                disabled={completionPercentage < 100 || saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                Proceed to Builder
                <FaArrowRight />
              </button>
            </div>
          </div>

          {/* Live Preview Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="sticky top-24">
              {/* Course Card Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {formData.title || "Course Title"}
                  </h3>
                  {formData.short_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {formData.short_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      formData.pricing_type === "free" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {formData.pricing_type === "free" ? "Free" : `₹${discountedPrice || formData.price}`}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {formData.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Checklist */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Completion Checklist
                </h3>
                <div className="space-y-2">
                  {[
                    { key: "title", label: "Course Title", done: formData.title },
                    { key: "short_description", label: "Short Description", done: formData.short_description },
                    { key: "description", label: "Description", done: formData.description },
                    { key: "department_id", label: "Department", done: formData.department_id },
                    { key: "category_id", label: "Category", done: formData.category_id },
                    { key: "level", label: "Level", done: formData.level },
                    { key: "language", label: "Language", done: formData.language },
                    { key: "thumbnail", label: "Thumbnail", done: thumbnailPreview },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.done ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}>
                        {item.done && <FaCheckCircle className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;