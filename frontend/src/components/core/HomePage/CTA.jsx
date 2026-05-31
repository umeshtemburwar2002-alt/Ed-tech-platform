import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaRocket, FaChevronRight } from 'react-icons/fa';

const CTA = () => {
  return (
    <div className="relative mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-12 bg-transparent text-white py-24 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="w-full relative overflow-hidden rounded-[3rem] p-12 md:p-24 text-center border border-white/10 shadow-2xl"
      >
        {/* Vibrant Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 z-0"></div>
        <div className="absolute inset-0 opacity-50 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-transparent to-purple-500/20 z-0"></div>

        {/* Floating Glowing Orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500/30 rounded-full blur-[60px] z-0 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-500/30 rounded-full blur-[80px] z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mb-8 w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-md"
          >
            <FaRocket className="text-3xl text-white transform -rotate-45" />
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            Ready to Start Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">Tech Career?</span>
          </h2>
          
          <p className="text-slate-300 text-lg md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Join thousands of learners who are already building their futures with our industry-leading courses and expert mentorship.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
            <Link to="/signup" className="w-full sm:w-auto">
              <button className="w-full group flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-100 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Get Started For Free <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/contact" className="w-full sm:w-auto">
              <button className="w-full px-10 py-5 bg-black/20 border border-white/20 text-white font-bold rounded-2xl hover:bg-black/40 backdrop-blur-md transition-all hover:border-white/40">
                Contact Sales
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CTA;
