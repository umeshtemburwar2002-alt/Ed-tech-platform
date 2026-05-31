import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaHeart,
  FaHeartBroken,
  FaShoppingCart,
  FaStar,
  FaUsers,
  FaClock,
  FaGraduationCap,
  FaRocket,
  FaFire,
  FaTags,
  FaPercent,
  FaTrophy,
  FaCheckCircle
} from 'react-icons/fa';
import { Button, Badge } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { removeFromWishlist } from '../../services/operations/wishlistAPI';
import { addToCart } from '../../slices/cartSlice';

const Wishlist = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const { wishlist: wishlistItems } = useSelector((state) => state.wishlist);
  
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort wishlist items
  const filteredItems = [...wishlistItems]
    .filter(item => {
      const title = item.course_name || item.title || "";
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const category = item.category || "";
      const matchesFilter = filterCategory === 'all' || category.toLowerCase().includes(filterCategory.toLowerCase());
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const titleA = a.course_name || a.title || "";
          const titleB = b.course_name || b.title || "";
          return titleA.localeCompare(titleB);
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'recent':
        default:
          return new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now());
      }
    });

  // Calculate statistics safely
  const stats = {
    total: wishlistItems.length,
    totalValue: wishlistItems.reduce((sum, item) => sum + Number(item.price || 0), 0),
    totalSavings: 0, // Simplified as originalPrice is not always available in DB
    avgRating: wishlistItems.length 
        ? (wishlistItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / wishlistItems.length).toFixed(1)
        : 0,
    categories: [...new Set(wishlistItems.map(item => item.category))].length
  };

  const handleRemoveFromWishlist = (itemId) => {
    dispatch(removeFromWishlist(itemId, token));
  };

  const handleAddToCart = (course) => {
    dispatch(addToCart(course));
  };

  const handleBuyNow = (itemId) => {
    toast.success('Redirecting to checkout...');
    // Buy now logic here
  };

  return (
    <div className="min-h-screen bg-richblack-900 text-richblack-5 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
                My Wishlist
              </h1>
              <p className="text-richblack-300 text-lg">
                Keep track of courses you want to take
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Items", value: stats.total, icon: FaHeart, color: "text-pink-400", bg: "bg-pink-600" },
              { label: "Total Value", value: `₹${stats.totalValue}`, icon: FaTags, color: "text-green-400", bg: "bg-green-600" },
              { label: "Avg Rating", value: stats.avgRating, icon: FaStar, color: "text-yellow-400", bg: "bg-yellow-600" },
              { label: "Categories", value: stats.categories, icon: FaGraduationCap, color: "text-purple-400", bg: "bg-purple-600" }
            ].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-richblack-800 rounded-xl p-4 border border-richblack-700 hover:border-pink-500 transition-all duration-300 group hover:scale-105"
                >
                  <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="text-lg text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-richblack-300 text-sm">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Wishlist Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-2xl font-bold text-white mb-2">Your wishlist is empty</h3>
              <p className="text-richblack-300 mb-6">
                Start adding courses you want to take later
              </p>
              <Link to="/all-courses">
                <Button variant="primary" className="bg-pink-600 hover:bg-pink-700">
                  <FaRocket className="mr-2" />
                  Explore Courses
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-richblack-800 rounded-xl border border-richblack-700 hover:border-pink-500 transition-all duration-300 group hover:scale-105 overflow-hidden p-6 flex flex-col"
                >
                  {/* Course Header Image with Remove Button */}
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-richblack-700 mb-4 relative group/image">
                    {item.thumbnail || item.thumbnail_url || item.custom_thumbnail_url ? (
                      <img src={item.thumbnail || item.thumbnail_url || item.custom_thumbnail_url} alt="thumbnail" className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center text-richblack-500 text-4xl">📚</div>
                    )}
                    
                    {/* Absolute positioned remove button */}
                    <button 
                      className="absolute top-2 right-2 bg-richblack-900/60 backdrop-blur-sm p-2 rounded-full border border-red-500/50 text-pink-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 shadow-lg z-10"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      <FaHeart className="w-4 h-4 hover:hidden" />
                      {/* We could do a broken heart on hover, but keeping it simple is fine */}
                    </button>
                    
                    {/* Dark overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-richblack-900/80 via-transparent to-transparent opacity-60"></div>
                  </div>

                  {/* Course Info */}
                  <div className="mb-4 flex-grow">
                    <Badge variant="outline" className="text-xs mb-2 border-pink-500/30 text-pink-400">{item.category || 'General'}</Badge>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-pink-400 transition-colors line-clamp-2">
                      {item.title || item.course_name}
                    </h3>
                  </div>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm mt-auto">
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      <span className="font-semibold">{item.rating || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-richblack-300">
                      <FaClock className="text-sm" />
                      <span className="text-sm">{item.duration || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-richblack-300">
                      <FaGraduationCap className="text-sm" />
                      <span className="text-sm">{item.level || 'All Levels'}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-400">
                          {item.price ? `₹${item.price}` : 'FREE'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 mt-auto">
                    <button
                      className="w-full flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40"
                      onClick={() => {
                        const course = { ...item };
                        if (!course._id) course._id = course.id;
                        handleAddToCart(course);
                      }}
                    >
                      <FaShoppingCart className="mr-2" />
                      Add to Cart
                    </button>
                    <button 
                      className="w-full flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-richblack-900 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40"
                      onClick={() => handleBuyNow(item.id)}
                    >
                      <FaRocket className="mr-2" />
                      Buy Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Wishlist;