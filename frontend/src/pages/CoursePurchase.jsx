import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { createOrder, confirmPayment } from '../services/operations/orderAPI';
import { FaCreditCard, FaCheckCircle, FaChevronRight, FaStar, FaUsers, FaPlayCircle, FaTag, FaTicketAlt } from 'react-icons/fa';
import { resetCart } from '../slices/cartSlice';
import { addToEnrolledCourses } from '../slices/profileSlice';
import { supabase } from '../config/supabaseClient';

const CoursePurchase = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, enrolledCourses } = useSelector((state) => state.profile);
  const { cart } = useSelector((state) => state.cart);
  
  // Debug: Check enrolled courses state
  console.log("Current Enrolled Courses:", enrolledCourses);
  
  // Use course from state (Direct Enroll) or from cart
  const directCourse = location.state?.course;
  const purchaseItems = directCourse ? [directCourse] : cart;
  
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const subtotal = purchaseItems.reduce((acc, curr) => {
    // Handle both old 'price' string and new 'salePrice' number
    const priceValue = curr.salePrice || curr.price;
    const price = typeof priceValue === 'string' 
      ? Number(priceValue.replace(/[^\d]/g, '')) 
      : priceValue;
    return acc + (price || 0);
  }, 0);

  const discountAmount = Math.round((subtotal * discount) / 100);
  const totalPrice = subtotal - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .single();

      if (error || !coupon) {
        toast.error("Invalid coupon code");
        setDiscount(0);
        setAppliedCoupon(null);
      } else {
        const now = new Date();
        const expiry = new Date(coupon.expiry_date);
        if (now > expiry) {
          toast.error("Coupon has expired");
          setDiscount(0);
          setAppliedCoupon(null);
        } else {
          setDiscount(coupon.discount_percent);
          setAppliedCoupon(coupon);
          toast.success(`Coupon applied! ${coupon.discount_percent}% off`);
        }
      }
    } catch (err) {
      toast.error("Error applying coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById('razorpay-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.id = 'razorpay-script';
        script.onload = () => {
          resolve(true);
        };
        script.onerror = () => {
          resolve(false);
        };
        document.body.appendChild(script);
      } else {
        resolve(true);
      }
    });
  };

  const handleConfirmPurchase = async () => {
    if (!user) {
      toast.error('Please login to proceed');
      navigate('/login');
      return;
    }
    setIsProcessing(true);
    try {
      // Create order on backend
      const orderData = await createOrder(purchaseItems, subtotal - discountAmount);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_YourKey', // Replace with actual key
        amount: orderData.amount, // amount in paise
        currency: orderData.currency || 'INR',
        name: 'EdTech Platform',
        description: 'Course Purchase',
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            // Verify payment on backend
            await confirmPayment(orderData.orderId, response.razorpay_payment_id, response.razorpay_signature, purchaseItems[0]?.id);
            // Enroll courses after successful verification
            for (const course of purchaseItems) {
              const { error: enrollError } = await supabase
                .from('enrollments')
                .insert([
                  {
                    user_id: user.id,
                    course_id: course.id,
                    enrolled_at: new Date().toISOString(),
                  },
                ]);
              if (enrollError) throw enrollError;
              dispatch(addToEnrolledCourses(course));
            }
            setIsSuccess(true);
            toast.success('Payment Successful!');
            if (!directCourse) {
              dispatch(resetCart());
            }
            setTimeout(() => navigate('/dashboard/enrolled-courses'), 1000);
          } catch (err) {
            console.error('Verification/Enrollment error:', err);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6a0dad',
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  if (isSuccess) {
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center p-6">
        <div className="bg-richblack-800 border border-richblack-700 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-caribbeangreen-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="text-caribbeangreen-300 text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Enrollment Successful!</h1>
          <p className="text-richblack-300 mb-8 leading-relaxed">
            Congratulations! You have been successfully enrolled in the course(s). You can now access them from your dashboard.
          </p>
          <button 
            onClick={() => navigate("/dashboard/enrolled-courses")}
            className="w-full py-4 bg-yellow-50 text-richblack-900 font-bold rounded-xl hover:bg-yellow-100 transition-all flex items-center justify-center gap-2 group"
          >
            Go to My Courses
            <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  if (purchaseItems.length === 0) {
    return (
      <div className="min-h-screen bg-richblack-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">No items to purchase</h2>
          <button onClick={() => navigate("/all-courses")} className="text-cyan-400 font-bold">Browse Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-richblack-900 text-white pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Left Column: Course Details */}
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl font-bold mb-8 flex items-center gap-4">
              <span className="w-2 h-10 bg-yellow-50 rounded-full"></span>
              Review Your Order
            </h1>
            
            <div className="space-y-6">
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="bg-richblack-800 border border-richblack-700 p-6 rounded-3xl flex flex-col md:flex-row gap-6 hover:border-richblack-600 transition-all shadow-xl">
                  <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden shrink-0 border border-white/5">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{item.title}</h3>
                    <p className="text-richblack-300 text-sm mb-4">By <span className="text-cyan-400 font-medium">{item.instructor}</span></p>
                    <div className="flex items-center gap-4 text-xs text-richblack-400">
                      <span className="flex items-center gap-1"><FaStar className="text-yellow-400" /> {item.rating}</span>
                      <span className="flex items-center gap-1"><FaUsers /> {item.students} students</span>
                      <span className="flex items-center gap-1"><FaPlayCircle /> 45 Lectures</span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-yellow-50 md:text-right">
                    ₹{item.salePrice || item.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-richblack-800 border border-richblack-700 p-8 rounded-3xl shadow-xl">
              <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'card' ? 'border-yellow-50 bg-yellow-50/5' : 'border-richblack-700 bg-richblack-900/50 hover:border-richblack-600'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'card' ? 'bg-yellow-50 text-richblack-900' : 'bg-richblack-700 text-white'}`}>
                    <FaCreditCard />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Credit / Debit Card</p>
                    <p className="text-xs text-richblack-400">Secure payment via Stripe</p>
                  </div>
                </button>
                <button 
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'upi' ? 'border-yellow-50 bg-yellow-50/5' : 'border-richblack-700 bg-richblack-900/50 hover:border-richblack-600'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-yellow-50 text-richblack-900' : 'bg-richblack-700 text-white'}`}>
                    <span className="font-black text-xs">UPI</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">UPI Payment</p>
                    <p className="text-xs text-richblack-400">Instant via Google Pay, PhonePe</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Price Summary */}
          <div className="w-full lg:w-96">
            <div className="bg-richblack-800 border border-richblack-700 p-8 rounded-3xl shadow-2xl sticky top-28">
              <h2 className="text-2xl font-bold mb-8">Order Summary</h2>
              
              {/* Coupon Section */}
              <div className="mb-8">
                <label className="text-sm font-bold text-richblack-300 block mb-3 flex items-center gap-2">
                  <FaTag className="text-yellow-50" /> Have a Coupon?
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={appliedCoupon}
                      className="w-full px-4 py-3 bg-richblack-900 border border-richblack-700 rounded-xl text-white focus:outline-none focus:border-yellow-50 disabled:opacity-50 uppercase placeholder:normal-case"
                    />
                    {appliedCoupon && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-caribbeangreen-300">
                        <FaCheckCircle />
                      </div>
                    )}
                  </div>
                  {!appliedCoupon ? (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponCode || isValidatingCoupon}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-yellow-50 font-bold rounded-xl border border-white/5 transition-all disabled:opacity-30"
                    >
                      {isValidatingCoupon ? "..." : "Apply"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setDiscount(0);
                        setCouponCode('');
                      }}
                      className="px-4 py-3 text-red-500 hover:text-red-400 text-sm font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-caribbeangreen-300 mt-2 flex items-center gap-1">
                    <FaTicketAlt /> {appliedCoupon.discount_percent}% discount applied successfully!
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-richblack-300">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-caribbeangreen-300">
                    <span>Discount ({discount}%)</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-richblack-300">
                  <span>Platform Fee</span>
                  <span className="text-caribbeangreen-300">FREE</span>
                </div>
                <div className="h-[1px] bg-richblack-700 my-4"></div>
                <div className="flex justify-between text-white font-bold text-xl">
                  <span>Total Amount</span>
                  <span className="text-yellow-50 font-black">₹{totalPrice}</span>
                </div>
              </div>
              
              <button 
                onClick={handleConfirmPurchase}
                disabled={isProcessing}
                className="w-full py-4 bg-gradient-to-r from-yellow-50 to-yellow-100 text-richblack-900 font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-yellow-50/10"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-richblack-900 border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>Confirm & Pay ₹{totalPrice}</>
                )}
              </button>
              <p className="text-center text-[10px] text-richblack-400 mt-6 leading-relaxed">
                By confirming your purchase, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CoursePurchase;
