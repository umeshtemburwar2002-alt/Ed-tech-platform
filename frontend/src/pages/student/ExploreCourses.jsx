import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { Search, Star, Users, Clock, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const courses = []; // Dummy data removed, replace with real data source

const categories = ["All", "Development", "Design", "Business", "Marketing", "Data Science"];

export default function ExploreCourses() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black" data-theme="dark">
      <div className="bg-gradient-to-r from-violet-900/30 to-cyan-900/30 py-20">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Explore Courses
            </h1>
            <p className="text-xl text-gray-300 mb-10">
              Discover courses from top instructors. Learn anything, anywhere.
            </p>

            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search for courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-14 py-4 text-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === category
                  ? "bg-gradient-to-br from-violet-600 to-cyan-500 text-white"
                  : "bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white"
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/courses/${course.id}`}>
                <Card hover className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-48 object-cover transition-transform duration-500 hover:scale-110"
                    />
                    {course.bestseller && (
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold">
                        Bestseller
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-medium">
                      {course.category}
                    </span>

                    <h3 className="text-lg font-bold text-white mt-3 mb-2 line-clamp-2">
                      {course.title}
                    </h3>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
                      <span className="text-sm text-gray-300">{course.instructor}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        {course.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {course.students.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div>
                        <span className="text-2xl font-bold text-white">₹{course.price}</span>
                        <span className="text-gray-500 line-through ml-2">₹{course.originalPrice}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
