import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaTrash, FaArrowLeft, FaArrowRight, FaCreditCard, FaGift, FaStar, FaClock, FaUsers, FaPlay, FaGraduationCap, FaCertificate, FaInfinity, FaMobile, FaHeadphones, FaShieldAlt, FaRocket, FaGem } from 'react-icons/fa';
import { removeFromCart } from '../slices/cartSlice';
import { toast } from 'react-hot-toast';
import Footer from '../components/common/Footer';

const Cart = () => {
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const subtotal = cart.reduce((total, item) => {
    const priceValue = item.salePrice || item.price;
    const price = typeof priceValue === 'string' 
      ? Number(priceValue.replace(/[^\d]/g, '')) 
      : priceValue;
    return total + (price * (item.quantity || 1));
  }, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  // Promo codes
  const promoCodes = {
    'WELCOME10': 10,
    'STUDENT20': 20,
    'SAVE15': 15,
    'NEWUSER25': 25,
    'LEARN50': 50
  };

  // Handle remove from cart
  const handleRemoveFromCart = (courseId) => {
    dispatch(removeFromCart(courseId));
    // Toast is already shown by cartSlice reducer — no duplicate needed
  };

  // Handle checkout
  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Navigate to purchase page
    navigate('/course-purchase', {
      state: {
        cartItems: cart,
        subtotal,
        total
      }
    });
  };

  // Continue shopping
  const handleContinueShopping = () => {
    if (user?.accountType === "Instructor") {
      navigate("/dashboard/instructor");
    } else {
      navigate('/all-courses');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-richblack-900 via-richblack-800 to-richblack-900">
        {/* Empty Cart */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-8xl mb-8">🛒</div>
              <h1 className="text-4xl font-bold text-white mb-6">Your Cart is Empty</h1>
              <p className="text-xl text-richblack-300 mb-12 leading-relaxed">
                Looks like you haven't added any courses to your cart yet. 
                Explore our amazing collection of courses and start your learning journey!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Link
                  to="/explore-courses"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all duration-300 px-8 py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-1 flex items-center justify-center gap-3"
                >
                  <FaRocket />
                  Explore Courses
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-richblack-900 via-richblack-800 to-richblack-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 mb-8">
              <FaShoppingCart className="text-purple-400 mr-3" />
              <span className="text-purple-300 font-semibold">🛒 Your Learning Cart</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Shopping Cart
              </span>
            </h1>
            
            <p className="text-xl text-richblack-300 mb-8">
              {cart.length} {cart.length === 1 ? 'course' : 'courses'} in your cart
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cart Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-richblack-800 rounded-2xl p-6 border border-richblack-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FaGraduationCap className="text-purple-400" />
                    Course List
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <AnimatePresence>
                    {cart.map((course, index) => (
                      <motion.div
                        key={course._id || course.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-richblack-700 rounded-xl p-6 border border-richblack-600 hover:border-purple-500 transition-all duration-300"
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Course Image */}
                          <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={course.thumbnail} 
                              alt={course.courseName || course.title} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Course Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-white mb-2">{course.courseName || course.title}</h3>
                                <p className="text-richblack-300 text-sm mb-3 line-clamp-2">
                                  {course.courseDescription || course.description}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-richblack-400 mb-3">
                                  <span className="flex items-center gap-1">
                                    <FaClock />
                                    {course.duration || '8 weeks'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FaPlay />
                                    {course.lessons || 45} lessons
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FaUsers />
                                    {course.studentsEnroled?.length || course.students || 1200}+ students
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                      <FaStar key={i} className={i < Math.floor(course.rating || 4.6) ? 'text-yellow-400' : 'text-gray-600'} />
                                    ))}
                                  </div>
                                  <span className="text-white font-semibold">{course.averageRating || course.rating || 4.6}</span>
                                  <span className="text-richblack-400 text-sm">({course.ratingAndReviews?.length || 156} reviews)</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleRemoveFromCart(course._id || course.id)}
                                className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                              >
                                <FaTrash />
                              </button>
                            </div>
                            
                            {/* Price and Quantity */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-white">₹{(course.salePrice || course.price)?.toLocaleString()}</span>
                                  {(course.originalPrice || course.oldPrice) && (
                                    <span className="text-richblack-400 line-through text-sm">₹{(course.originalPrice || course.oldPrice).toLocaleString()}</span>
                                  )}
                                </div>
                                
                                {(course.originalPrice || course.oldPrice) && (
                                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                                    {course.discount ? `${course.discount}% OFF` : `${Math.round((1 - (course.salePrice || course.price) / (course.originalPrice || course.oldPrice)) * 100)}% OFF`}
                                  </span>
                                )}
                              </div>

                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-richblack-800 rounded-2xl p-6 border border-richblack-700 sticky top-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaCreditCard className="text-purple-400" />
                  Order Summary
                </h2>

                
                {/* Price Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-richblack-300">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  
                  
                  <div className="border-t border-richblack-600 pt-4">
                    <div className="flex items-center justify-between text-xl font-bold text-white">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Course Benefits */}
                <div className="bg-richblack-700 rounded-xl p-4 mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FaGem className="text-yellow-400" />
                    What's Included
                  </h3>
                  <div className="space-y-2 text-sm text-richblack-300">
                    <div className="flex items-center gap-2">
                      <FaInfinity className="text-green-400" />
                      <span>Lifetime access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaMobile className="text-blue-400" />
                      <span>Mobile & desktop access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCertificate className="text-purple-400" />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaHeadphones className="text-orange-400" />
                      <span>24/7 support</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-richblack-600 disabled:to-richblack-600 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105 disabled:scale-100"
                  >
                      <>
                        <FaArrowRight />
                        Proceed to Checkout
                      </>
                  </button>
                  
                  <button
                    onClick={handleContinueShopping}
                    className="w-full border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-3"
                  >
                    <FaArrowLeft />
                    Continue Shopping
                  </button>
                </div>
                
                {/* Security Badge */}
                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-richblack-400 text-sm">
                    <FaShieldAlt className="text-green-400" />
                    <span>Secure checkout with 256-bit SSL encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Cart;