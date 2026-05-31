import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCode, FaRocket, FaStar } from 'react-icons/fa';

const Hero = () => {
  return (
    <div className="relative mx-auto flex flex-col lg:flex-row w-11/12 max-w-maxContent items-center justify-between gap-16 py-20 lg:py-32 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      {/* Left Content */}
      <div className="flex flex-col items-start text-left lg:w-1/2 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="group w-fit rounded-full bg-white/5 border border-white/10 p-1 font-bold text-slate-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/20 mb-8 cursor-pointer backdrop-blur-md"
        >
          <Link to="/signup" className="flex items-center gap-3 px-6 py-1.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs">
              <FaRocket />
            </span>
            <p className="text-sm tracking-wide">Join the 100K+ Learners Community</p>
            <FaArrowRight className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6"
        >
          Empower Your Future with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-sm">
            Coding Skills
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-slate-400 font-medium mb-10 max-w-lg leading-relaxed"
        >
          Master top-tier tech skills from industry experts. Learn at your own pace with hands-on projects and step-by-step guidance designed for your career growth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          <Link to="/signup" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
            <button className="relative px-8 py-3.5 bg-[#000814] text-white font-bold rounded-xl text-lg flex items-center gap-2 hover:scale-[0.98] transition-transform">
              Start Learning Free <FaArrowRight className="text-sm" />
            </button>
          </Link>
          <Link to="/explore-courses">
            <button className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-lg transition-all backdrop-blur-sm">
              Explore Catalog
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Right Content - Floating UI */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative lg:w-1/2 w-full max-w-md lg:max-w-none flex justify-center z-10"
      >
        <div className="relative w-full aspect-square max-w-[500px]">
          {/* Main Floating Glass Card */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="absolute inset-0 m-auto w-3/4 h-3/4 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl p-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="text-xs text-slate-500 font-mono">React Native Dev</div>
              </div>
              <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
              <div className="h-4 w-1/2 bg-white/5 rounded-full"></div>
              <div className="h-4 w-5/6 bg-white/5 rounded-full"></div>
              
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-white/5 p-3 flex flex-col justify-end">
                  <span className="text-2xl text-purple-400"><FaCode /></span>
                </div>
                <div className="h-20 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl border border-white/5 p-3 flex flex-col justify-end">
                  <div className="h-2 w-full bg-cyan-400/30 rounded-full mb-2"></div>
                  <div className="h-2 w-2/3 bg-cyan-400/30 rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-6 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 flex items-center justify-center font-bold text-white shadow-lg">JS</div>
              <div>
                <p className="text-sm font-bold text-white">JavaScript Mastery</p>
                <p className="text-xs text-slate-400">95% Completed</p>
              </div>
            </div>
          </motion.div>

          {/* Small Floating Card 1 */}
          <motion.div
            animate={{ y: [5, -15, 5] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
            className="absolute top-10 -left-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
              <FaStar />
            </div>
            <div>
              <p className="text-white font-bold">4.9/5 Rating</p>
              <p className="text-xs text-slate-400">From 50k+ reviews</p>
            </div>
          </motion.div>

          {/* Small Floating Card 2 */}
          <motion.div
            animate={{ y: [-15, 5, -15] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-12 -right-4 bg-[#0B1228]/80 border border-purple-500/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B1228] bg-slate-700 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-purple-400">+10k Active</p>
            </div>
            <p className="text-sm text-slate-300 font-medium">Students learning daily</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
