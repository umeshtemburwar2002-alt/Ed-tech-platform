import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CourseCard from './CourseCard';
import { getAllCourses } from '../../../services/operations/courseDetailsAPI';

export default function CoursesSection() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const result = await getAllCourses();
      if (result) {
        setCourses(result);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <section className="py-24 px-4 md:px-8 lg:px-20 bg-white relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full"
          >
            Explore our programs
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            Most Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Courses</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Choose from over 1,000 online video courses with new additions published every month.
          </motion.p>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {courses.slice(0, 6).map((course, index) => (
          <CourseCard
                key={course.id || index}
                course={{
                  id: course.id,
                  title: course.title || course.course_name || "Untitled Course",
                  description: course.description || course.course_description || "",
                  // Thumbnail fields — correct DB column names
                  thumbnail: course.thumbnail || null,
                  thumbnail_url: course.thumbnail_url || null,
                  custom_thumbnail_url: course.custom_thumbnail_url || null,
                  final_thumbnail_url: course.final_thumbnail_url || null,
                  youtube_thumbnail_url: course.youtube_thumbnail_url || null,
                  youtube_video_url: course.youtube_video_url || null,
                  preview_video_url: course.preview_video_url || null,
                  price: course.price,
                  rating: course.average_rating || course.rating || 0,
                  duration: course.total_duration || "Self-Paced",
                  level: course.level || "Intermediate",
                  isFree: course.is_free || course.price === 0,
                }}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No courses available at the moment.</p>
          </div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-20"
        >
          <button
            onClick={() => navigate('/explore-courses')}
            className="group relative px-8 py-4 bg-gray-900 text-white font-bold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              View All Courses
              <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
