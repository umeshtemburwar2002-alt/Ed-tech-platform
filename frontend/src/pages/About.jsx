import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const About = () => {
  const { user } = useSelector((state) => state.profile);
  const isLoggedIn = !!user;
  const userRole = user?.accountType?.toLowerCase() || 'guest'; // 'student', 'instructor', or 'guest'

  const stats = [
    { label: 'Total Students', value: '15,000+', icon: 'fa-users' },
    { label: 'Courses Available', value: '500+', icon: 'fa-book' },
    { label: 'Success Rate', value: '95%', icon: 'fa-chart-line' },
    { label: 'Avg Salary Hike', value: '70%', icon: 'fa-money-bill-wave' }
  ];

  const renderGuestAbout = () => (
    <div className="space-y-32">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-blue-600/10 rounded-full blur-[120px] -z-10 mix-blend-screen"></div>
        <div className="space-y-8 max-w-5xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 font-bold text-sm tracking-wide backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.15)]">
            Our Story & Vision
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
            Empowering the Next Generation of <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Tech Leaders</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            We bridge the gap between traditional education and industry requirements. Our mission is to make high-quality, practical tech education accessible to everyone, everywhere.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center gap-6 pt-4">
            <Link to="/signup" className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
              <button className="relative px-8 py-4 bg-[#0B1228] text-white font-bold rounded-xl text-lg flex items-center gap-2 hover:scale-[0.98] transition-transform border border-white/10">
                Join Now <i className="fas fa-arrow-right text-sm"></i>
              </button>
            </Link>
            <Link to="/all-courses" className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm text-lg">
              Browse Courses
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="grid md:grid-cols-2 gap-8 px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="relative bg-white/[0.02] p-12 rounded-[3rem] space-y-6 border border-white/10 overflow-hidden group hover:border-blue-500/30 transition-colors backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <i className="fas fa-bullseye"></i>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Our Mission</h2>
          <p className="text-slate-400 leading-relaxed text-lg">
            Traditional education often lags behind rapidly evolving tech trends. We solve this by providing industry-aligned curriculum, real-world projects, and direct mentorship from experts at top tech companies.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="relative bg-white/[0.02] p-12 rounded-[3rem] space-y-6 border border-white/10 overflow-hidden group hover:border-purple-500/30 transition-colors backdrop-blur-md">
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 group-hover:bg-purple-500/20 transition-colors"></div>
          <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center text-2xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <i className="fas fa-eye"></i>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Our Vision</h2>
          <p className="text-slate-400 leading-relaxed text-lg">
            We envision a world where your location or background doesn't dictate your career potential. We're building the future of digital learning—personalized, interactive, and fiercely outcome-driven.
          </p>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="bg-white/[0.02] border y-white/5 py-20 px-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-cyan-900/10 z-0"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto relative z-10">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center space-y-4 group"
            >
              <div className="text-cyan-400 text-4xl mb-2 group-hover:scale-110 transition-transform group-hover:text-cyan-300">
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{stat.value}</h3>
              <p className="text-slate-400 font-bold tracking-widest uppercase text-sm group-hover:text-slate-200 transition-colors">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="space-y-16 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Choose Us?</span></h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">We don't just teach code; we build careers through a comprehensive, supportive learning ecosystem.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { title: 'Real-World Projects', desc: 'Build portfolio-ready projects that mirror actual industry tasks.', icon: 'fa-laptop-code', color: 'text-blue-400' },
            { title: 'Industry Mentors', desc: 'Get guidance from seniors at Google, Amazon, and Meta.', icon: 'fa-chalkboard-teacher', color: 'text-purple-400' },
            { title: 'Flexible Learning', desc: 'Study at your own pace with lifetime access to all content.', icon: 'fa-clock', color: 'text-amber-400' },
            { title: 'Verified Certificates', desc: 'Earn certificates recognized by top global recruiters.', icon: 'fa-certificate', color: 'text-emerald-400' }
          ].map((item, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -10 }} 
              className="bg-white/[0.02] p-8 rounded-3xl text-center space-y-6 hover:bg-white/[0.05] transition-all duration-300 border border-white/5 hover:border-white/20 backdrop-blur-md group relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-white/10 group-hover:scale-110 transition-transform">
                <i className={`fas ${item.icon} ${item.color}`}></i>
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Success Stories */}
      <section className="px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent z-0"></div>
        <div className="max-w-7xl mx-auto relative z-10 space-y-16 py-12">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Success Stories</span></h2>
            <p className="text-slate-400 text-lg mt-4">See how our platform has transformed careers worldwide.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Rohan Mehta', role: 'SDE at Microsoft', text: 'The Full-Stack course changed my life. I went from zero coding knowledge to a 15 LPA package.', img: 'https://api.dicebear.com/5.x/initials/svg?seed=RM' },
              { name: 'Ananya Iyer', role: 'UI/UX Designer', text: 'The mentorship here is unmatched. My portfolio went from basic to professional in 3 months.', img: 'https://api.dicebear.com/5.x/initials/svg?seed=AI' },
              { name: 'Vikram Singh', role: 'Data Scientist', text: 'Real-world datasets and expert feedback helped me crack my dream role in AI.', img: 'https://api.dicebear.com/5.x/initials/svg?seed=VS' }
            ].map((story, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="bg-white/[0.03] backdrop-blur-md p-8 rounded-[2.5rem] space-y-6 border border-white/10 hover:border-pink-500/30 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] group relative"
              >
                <div className="absolute -top-6 -right-6 text-8xl text-white/[0.02] font-serif group-hover:text-white/[0.05] transition-colors z-0">"</div>
                <div className="relative z-10">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-pink-500/30 rounded-full blur animate-pulse"></div>
                    <img src={story.img} alt={story.name} className="relative w-20 h-20 rounded-full border-2 border-white/20 object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="italic text-slate-300 text-lg leading-relaxed flex-1 min-h-[100px]">"{story.text}"</p>
                  <div className="pt-6 mt-4 border-t border-white/10">
                    <h4 className="font-bold text-xl text-white tracking-wide">{story.name}</h4>
                    <p className="text-pink-400 font-semibold text-sm mt-1">{story.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderStudentAbout = () => (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 rounded-[3rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold">Welcome back, {user?.firstName}! 👋</h1>
          <p className="text-blue-100 text-lg max-w-xl">You're doing great! You've completed 65% of your learning goals this month. Keep up the momentum.</p>
          <div className="flex gap-4 pt-4">
            <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl">
              <p className="text-sm opacity-80">Courses Enrolled</p>
              <p className="text-2xl font-bold">4</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl">
              <p className="text-sm opacity-80">Certificates Earned</p>
              <p className="text-2xl font-bold">2</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Your Learning Journey</h2>
          <div className="space-y-6">
            {[
              { title: 'Advanced React Patterns', progress: 75, instructor: 'Sarah Drasner' },
              { title: 'Python for Data Science', progress: 40, instructor: 'Dr. Angela Yu' }
            ].map((course, idx) => (
              <div key={idx} className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">{course.title}</h3>
                  <span className="text-blue-600 font-bold">{course.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${course.progress}%` }} transition={{ duration: 1 }} className="bg-blue-600 h-full rounded-full shadow-lg shadow-blue-500/30"></motion.div>
                </div>
                <p className="text-sm text-slate-500">Instructor: {course.instructor}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Achievements</h2>
          <div className="glass p-8 rounded-[2.5rem] text-center space-y-6">
            <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
              <i className="fas fa-trophy"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Career Growth Tip</h3>
              <p className="text-slate-500 text-sm mt-2">"Focus on building 3 high-quality portfolio projects rather than 10 basic ones."</p>
            </div>
            <Link to="/contact" className="w-full btn-primary block py-3">Get Career Support</Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeacherAbout = () => (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-10 rounded-[3rem] bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-bold">Welcome, Instructor {user?.firstName}! 🎓</h1>
          <p className="text-slate-400 text-lg">Your courses have reached 2,450 new students this week. Amazing impact!</p>
          <div className="flex gap-4 pt-4 justify-center md:justify-start">
            <Link to="/instructor/add-course" className="btn-primary">Create New Course</Link>
            <Link to="/instructor/my-courses" className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold transition-all">Manage Content</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
            <p className="text-blue-400 text-2xl font-bold">12.5K</p>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Students Taught</p>
          </div>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
            <p className="text-indigo-400 text-2xl font-bold">4.9/5</p>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Avg Rating</p>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Recent Performance</h2>
          <div className="space-y-6">
            {[
              { title: 'Mastering JavaScript ES6', enrollments: 850, rating: 4.9, earnings: '₹42,500' },
              { title: 'Node.js Backend Deep Dive', enrollments: 420, rating: 4.8, earnings: '₹31,200' }
            ].map((course, idx) => (
              <div key={idx} className="glass p-8 rounded-3xl flex justify-between items-center group hover:bg-blue-50 transition-all cursor-pointer">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                  <p className="text-sm text-slate-500">{course.enrollments} New Enrollments</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{course.earnings}</p>
                  <div className="flex text-yellow-500 text-xs gap-1 mt-1">
                    <i className="fas fa-star"></i> {course.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Instructor Tips</h2>
          <div className="glass p-8 rounded-[2.5rem] space-y-6 bg-indigo-50/50">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">Engagement Boost</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Adding a 5-minute quiz at the end of each module increases course completion rates by 30%.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0">
                <i className="fas fa-video"></i>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">Content Quality</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Students prefer shorter, 10-15 minute focused videos over long 1-hour sessions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[#000814] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {renderGuestAbout()}
        </motion.div>

        {/* Global Footer CTA for Guests */}
        {!isLoggedIn && (
          <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-24 glass-dark rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden border border-white/5">
            <div className="relative z-10 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white">Ready to Start Your Journey?</h2>
              <p className="text-slate-400 text-xl max-w-2xl mx-auto">Join thousands of students who have already transformed their careers through our platform.</p>
              <div className="flex justify-center gap-4 pt-4">
                <Link to="/signup" className="btn-primary py-4 px-10 text-lg">Join Our Community</Link>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default About;
