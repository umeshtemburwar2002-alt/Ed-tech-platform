import React from 'react';
import { FaCode, FaRocket, FaCertificate, FaUsers } from 'react-icons/fa';
import { motion } from 'framer-motion';

const features = [
  {
    icon: <FaCode className="text-blue-400 group-hover:text-white transition-colors" />,
    title: "Hands-on Learning",
    desc: "Learn by doing with real-world projects and interactive coding exercises.",
    color: "from-blue-600/20 to-cyan-500/20",
    border: "group-hover:border-blue-500/50"
  },
  {
    icon: <FaRocket className="text-purple-400 group-hover:text-white transition-colors" />,
    title: "Career Growth",
    desc: "Gain the skills you need to land your dream job in tech and beyond.",
    color: "from-purple-600/20 to-pink-500/20",
    border: "group-hover:border-purple-500/50"
  },
  {
    icon: <FaCertificate className="text-amber-400 group-hover:text-white transition-colors" />,
    title: "Certified Courses",
    desc: "Earn certificates recognized by top industry leaders and companies.",
    color: "from-amber-600/20 to-orange-500/20",
    border: "group-hover:border-amber-500/50"
  },
  {
    icon: <FaUsers className="text-emerald-400 group-hover:text-white transition-colors" />,
    title: "Expert Mentors",
    desc: "Get guidance from industry experts who are passionate about teaching.",
    color: "from-emerald-600/20 to-teal-500/20",
    border: "group-hover:border-emerald-500/50"
  }
];

const Features = () => {
  return (
    <div className="relative mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-12 bg-transparent text-white py-24 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-[#070B19] to-[#070B19]"></div>

      <div className="text-center max-w-3xl z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight"
        >
          Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Key Features</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-slate-400 text-lg leading-relaxed"
        >
          We provide a holistic learning experience that goes beyond just watching videos, ensuring you build real skills for the real world.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full z-10">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ y: -8 }}
            className={`flex flex-col items-start p-8 rounded-3xl bg-white/[0.03] border border-white/10 ${feature.border} backdrop-blur-md transition-all duration-300 group relative overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
            
            <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/20">
              {feature.icon}
            </div>
            
            <h3 className="relative z-10 text-xl font-bold mb-3 text-white group-hover:text-white transition-colors">{feature.title}</h3>
            <p className="relative z-10 text-slate-400 text-sm leading-relaxed group-hover:text-slate-200 transition-colors">
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Features;
