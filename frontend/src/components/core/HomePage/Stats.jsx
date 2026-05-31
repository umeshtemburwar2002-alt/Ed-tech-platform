import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { count: "100K+", label: "Active Students", color: "from-cyan-400 to-blue-500" },
  { count: "50+", label: "Expert Mentors", color: "from-purple-400 to-pink-500" },
  { count: "200+", label: "Top Courses", color: "from-emerald-400 to-teal-500" },
  { count: "95%", label: "Success Rate", color: "from-amber-400 to-orange-500" }
];

const Stats = () => {
  return (
    <div className="relative py-24 bg-transparent overflow-hidden">
      <div className="mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-10 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 w-full gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative group p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 ease-in-out w-full h-full" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} >
                <div className={`w-full h-full bg-gradient-to-br ${stat.color}`}></div>
              </div>
              <h2 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color} drop-shadow-md`}>
                {stat.count}
              </h2>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest text-center mt-2 group-hover:text-white transition-colors duration-300">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
