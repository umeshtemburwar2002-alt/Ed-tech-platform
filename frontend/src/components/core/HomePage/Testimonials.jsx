import React from 'react';
import { motion } from 'framer-motion';
import { FaQuoteLeft, FaStar } from 'react-icons/fa';

const reviews = [
  {
    name: "Rahul Mehra",
    role: "Full Stack Developer",
    image: "https://api.dicebear.com/5.x/initials/svg?seed=RM",
    text: "The courses are incredibly detailed. I went from knowing nothing to landing my first job in 6 months.",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "group-hover:border-blue-500/50"
  },
  {
    name: "Sneha Gupta",
    role: "UI/UX Designer",
    image: "https://api.dicebear.com/5.x/initials/svg?seed=SG",
    text: "Learning here was a game changer for my career. The mentors are always ready to help and provide amazing insights.",
    color: "from-purple-500/20 to-pink-500/20",
    border: "group-hover:border-purple-500/50"
  },
  {
    name: "Amit Singh",
    role: "Data Scientist",
    image: "https://api.dicebear.com/5.x/initials/svg?seed=AS",
    text: "Top notch content and hands-on projects. Highly recommended for anyone serious about breaking into tech.",
    color: "from-amber-500/20 to-orange-500/20",
    border: "group-hover:border-amber-500/50"
  }
];

const Testimonials = () => {
  return (
    <div className="relative mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-12 bg-transparent text-white py-24 overflow-hidden">
      <div className="text-center z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight"
        >
          What Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Students Say</span>
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8 z-10">
        {reviews.map((review, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
            whileHover={{ y: -8 }}
            className={`flex flex-col gap-6 p-8 rounded-3xl bg-white/[0.03] border border-white/10 ${review.border} backdrop-blur-md relative overflow-hidden group transition-all duration-300`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${review.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
            
            <FaQuoteLeft className="text-5xl text-white/5 absolute top-6 right-6 z-0 transform group-hover:scale-110 group-hover:text-white/10 transition-all duration-300" />
            
            <div className="flex gap-1 text-yellow-400 text-sm relative z-10">
              {[...Array(5)].map((_, i) => <FaStar key={i} />)}
            </div>

            <p className="text-slate-300 italic leading-relaxed z-10 flex-1">
              "{review.text}"
            </p>
            
            <div className="flex items-center gap-4 mt-4 pt-6 border-t border-white/10 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur animate-pulse"></div>
                <img src={review.image} alt={review.name} className="relative w-12 h-12 rounded-full border-2 border-white/20 object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white tracking-wide">{review.name}</h4>
                <p className="text-slate-400 text-xs font-semibold">{review.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
