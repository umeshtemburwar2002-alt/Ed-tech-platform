import React from "react";
import { motion } from "framer-motion";
import { 
  FaCode, FaRobot, FaCloud, FaShieldAlt, FaChartBar, FaDocker, FaClock, FaSignal, 
  FaUserTie, FaProjectDiagram, FaUserGraduate, FaBriefcase,
  FaArrowRight, FaLaptopCode, FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaDatabase
} from "react-icons/fa";
import { Link } from "react-router-dom";
import Footer from "../components/common/Footer";
import heroImg from "../assets/Images/signup.webp";
import bannerVideo from "../assets/Images/banner.mp4";
import posterImg from "../assets/Images/TimelineImage.png";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import CoursesSection from "../components/core/HomePage/CoursesSection";

export default function LandingPage() {
  const { user } = useSelector((state) => state.profile);
  const navigate = useNavigate();

  const features = [
    {
      title: "Live Mentorship",
      desc: "Get direct guidance from industry experts through live interactive sessions.",
      icon: <FaUserTie />,
    },
    {
      title: "Real Industry Projects",
      desc: "Build your portfolio by working on production-level real-world projects.",
      icon: <FaProjectDiagram />,
    },
    {
      title: "Internship Assistance",
      desc: "Top performers get guaranteed internship referrals to partner tech startups.",
      icon: <FaUserGraduate />,
    },
    {
      title: "Job Placement Support",
      desc: "Resume building, mock interviews, and access to our exclusive job portal.",
      icon: <FaBriefcase />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#000814] text-richblack-5 font-inter overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* SECTION 1 – HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 px-4 md:px-8 lg:px-20 overflow-hidden bg-gradient-to-b from-[#001d3d] via-[#000814] to-[#000814]">
        {/* Background Video (home.mp4) */}
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/home.mp4" type="video/mp4" />
          <source src={bannerVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#001d3d]/60 via-[#000814]/60 to-[#000814]/70 pointer-events-none"></div>
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm font-semibold mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              Join 50,000+ Successful Learners
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
              Master IT Skills <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                That Matter
              </span>
            </h1>
            
            <p className="mt-8 text-xl text-richblack-200 max-w-lg leading-relaxed font-medium">
              Join 50,000+ learners and become job-ready with <span className="text-blue-400">AI-powered learning</span>. Build the future you deserve.
            </p>
            
            <div className="mt-12 flex flex-wrap gap-6">
              <Link to="/signup">
                <button className="relative group px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]">
                  Start Learning
                </button>
              </Link>
              <Link to="/course-catalog">
                <button className="px-10 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md font-bold text-lg hover:bg-white/10 transition-all">
                  Explore Courses
                </button>
              </Link>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-16 pt-8 border-t border-richblack-800 flex items-center gap-8">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <img key={i} className="w-10 h-10 rounded-full border-2 border-richblack-900" src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                ))}
              </div>
              <div className="text-sm">
                <p className="text-richblack-5 font-bold">4.9/5 Rating</p>
                <p className="text-richblack-400">from 10k+ reviews</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative flex justify-center items-center"
          >
            {/* Background Decorative Circles */}
            <div className="absolute w-[110%] aspect-square rounded-full bg-blue-500/10 blur-[100px] -z-10 animate-pulse"></div>
            
            {/* Green Circle with Dashed Border (Requested Design) */}
            <div className="relative w-full max-w-[500px] aspect-square">
              {/* Rotating Dashed Circle */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dashed border-emerald-400/30"
              ></motion.div>
              
              {/* Inner Solid Circle */}
              <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden group">
                <img 
                  src={heroImg} 
                  alt="Confident professional with laptop in a modern library" 
                  className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000814]/60 via-transparent to-transparent"></div>
              </div>

              {/* Floating Stat Cards (Requested Design) */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -left-12 top-[20%] p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-20 flex items-center gap-4 border border-white/20"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                  <FaUserGraduate />
                </div>
                <div>
                  <p className="text-richblack-900 font-black text-lg">50K+</p>
                  <p className="text-richblack-600 text-[10px] font-bold uppercase tracking-wider">Happy Learners</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute -right-12 bottom-[25%] p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-20 flex items-center gap-4 border border-white/20"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                  <FaLaptopCode />
                </div>
                <div>
                  <p className="text-richblack-900 font-black text-lg">70+</p>
                  <p className="text-richblack-600 text-[10px] font-bold uppercase tracking-wider">Pro Courses</p>
                </div>
              </motion.div>

              {/* Small Floating Icons */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-0 right-1/4 p-3 bg-richblack-800/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-20 text-yellow-400 text-xl"
              >
                <FaCode />
              </motion.div>
              
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute bottom-10 left-10 p-3 bg-richblack-800/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-20 text-purple-400 text-xl"
              >
                <FaRobot />
              </motion.div>
              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity }}
                className="absolute top-8 left-1/4 p-3 bg-richblack-800/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-20 text-cyan-300 text-xl"
              >
                <FaCloud />
              </motion.div>
              <motion.div 
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute bottom-20 right-12 p-3 bg-richblack-800/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-20 text-pink-300 text-xl"
              >
                <FaDatabase />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3 – WHY CHOOSE US */}
      <section className="py-32 bg-[#001d3d]/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-20 text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold mb-24 tracking-tight"
          >
            Why Choose Us?
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-12 bg-richblack-800/40 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] hover:bg-richblack-800/60 transition-all duration-500 text-left group hover:border-blue-500/20"
              >
                <div className="w-20 h-20 bg-richblack-900 rounded-[2rem] flex items-center justify-center text-4xl mb-10 group-hover:scale-110 transition-transform shadow-2xl border border-white/5 text-blue-400">
                  {feature.icon}
                </div>
                <h4 className="text-2xl font-bold mb-4 group-hover:text-blue-200 transition-colors">{feature.title}</h4>
                <p className="text-richblack-400 text-lg leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW SECTION – COURSES SECTION */}
      <CoursesSection />

      {/* SECTION 4 – BOTTOM IMAGE SECTION */}
      <section className="py-16 px-4 md:px-8 lg:px-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative group">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row items-center lg:items-stretch relative min-h-[380px] shadow-[0_30px_60px_rgba(37,99,235,0.15)] border border-white/10"
          >
            {/* Left Media (Video) */}
            <div className="order-1 lg:order-1 w-full lg:w-5/12 h-[280px] lg:h-auto relative overflow-hidden">
              <video 
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={posterImg}
                aria-label="Learning showcase"
                className="absolute inset-0 w-full h-full object-cover object-center brightness-[1.05]"
              >
                <source src={bannerVideo} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-blue-900/10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-indigo-700/30"></div>
            </div>
            
            {/* Right Text Content */}
            <div className="order-2 w-full lg:w-7/12 p-8 lg:p-14 text-white z-10 relative flex flex-col justify-center">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-blue-100 text-xs font-bold mb-6 tracking-widest uppercase self-start">
                Career Transformation
              </div>
              <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter text-white">
                Start Your IT <br /> Career Today
              </h2>
              <p className="mt-4 text-base font-medium text-blue-100 leading-relaxed max-w-sm opacity-90">
                Don't just dream about a career in tech. Build it with practical skills and real projects.
              </p>
              <button className="mt-8 group flex items-center gap-4 bg-white text-blue-900 px-8 py-3.5 rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl hover:shadow-white/20 self-start">
                Apply Now 
                <FaArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
