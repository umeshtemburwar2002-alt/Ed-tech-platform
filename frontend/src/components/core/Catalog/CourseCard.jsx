import React from 'react';
import { Link } from 'react-router-dom';
import CourseActionButtons from '../../Course/CourseActionButtons';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { addToCart } from '../../../slices/cartSlice';

const CourseCard = ({ course, enrolled }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.profile);
  const { cart } = useSelector((state) => state.cart);

  const isCourseInCart = cart.some((item) => (item.id || item._id) === (course.id || course._id));

  const handleAddToCart = () => {
    if (user && user?.accountType === "Instructor") {
      return;
    }
    dispatch(addToCart(course));
  };

  const handleEnrollNow = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { from: course.path || `/courses/${course.id || course._id}` } });
      return;
    }
    const navigationPath = course.path || `/courses/${course.id || course._id}`;
    navigate(navigationPath);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(course.path || `/courses/${course.id || course._id}`);
  };

  return (
    <div 
      onClick={handleEnrollNow}
      className="bg-richblack-800 rounded-3xl overflow-hidden shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-white/5 hover:border-cyan-500/30 group cursor-pointer"
    >
      <div className="relative block overflow-hidden">
        <img src={course.thumbnail} alt={course.title} className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
          <div className="bg-cyan-500/90 p-4 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
            <FaPlayCircle className="text-white text-3xl" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-richblack-900 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          {(course.isFree || course.price === 0) ? (
            <span className="bg-gradient-to-r from-green-400 to-green-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              100% Free
            </span>
          ) : (
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              Premium
            </span>
          )}
          <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
            {course.isFree || course.price === 0 ? "Free Access" : "Paid Course"}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">{course.title}</h3>
            <div className="flex items-center gap-2 text-xs text-richblack-300 font-medium">
              <span className="flex items-center gap-1">
                <i className="far fa-clock text-cyan-400"></i> {course.duration}
              </span>
              <span className="w-1 h-1 bg-richblack-600 rounded-full"></span>
              <span className="text-cyan-400 font-bold uppercase tracking-tighter">{course.level}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex text-yellow-400 text-[10px]">
            {[...Array(5)].map((_, i) => (
              <FaStar key={i} className={i < Math.floor(course.rating || 4.5) ? "text-yellow-400" : "text-richblack-600"} />
            ))}
          </div>
          <span className="text-xs font-black text-white">{course.rating || '4.8'}</span>
          <span className="text-richblack-500 text-[10px] font-bold">({course.students?.toLocaleString() || '10,000'} Learners)</span>
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-richblack-500 uppercase tracking-widest">Investment</span>
              <span className="text-xl font-black text-green-500 uppercase tracking-tighter italic">
                {course.isFree || course.price === 0 ? "Free" : `₹${course.price}`}
              </span>
            </div>
            <CourseActionButtons
                price={course.isFree || course.price === 0 ? 0 : course.price}
                isFree={course.isFree || course.price === 0}
                isEnrolled={user && course?.studentsEnrolled?.includes(user._id)}
                onBuy={handleEnrollNow}
                disableAddToCart={!user}

                buyLoading={false}
                addLoading={false}
                enrolledRender={<button className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Go To Classroom
                </button>}
              />
          </div>
          <button 
            onClick={handleViewDetails}
            className="w-full py-2.5 border border-white/10 rounded-xl text-xs font-bold text-richblack-300 hover:bg-white/5 transition-all uppercase tracking-widest"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
