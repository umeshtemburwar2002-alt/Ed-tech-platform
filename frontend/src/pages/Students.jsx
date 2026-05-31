import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Students = () => {
  const { user } = useSelector((state) => state.profile);
  const isLoggedIn = !!user;
  const userRole = user?.accountType?.toLowerCase() || 'guest';

  const stats = [
    { label: 'Total Students', value: '150K+', icon: 'fa-users', color: 'text-blue-600' },
    { label: 'Active Learners', value: '45K+', icon: 'fa-user-clock', color: 'text-green-600' },
    { label: 'Courses Completed', value: '85K+', icon: 'fa-check-double', color: 'text-indigo-600' },
    { label: 'Certificates Issued', value: '60K+', icon: 'fa-certificate', color: 'text-yellow-600' }
  ];

  const renderGuestStudents = () => (
    <div className="space-y-32">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto px-6 py-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 rounded-full blur-[100px] -z-10 mix-blend-screen"></div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-400 font-semibold text-sm backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          Join 150,000+ Global Learners
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
          Meet Our <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">Amazing Community</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
          From absolute beginners to seasoned industry experts, witness the incredible career transformations of learners worldwide.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center gap-4 pt-4">
          <Link to="/signup" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
            <button className="relative px-8 py-4 bg-[#0B1228] text-white font-bold rounded-xl text-lg flex items-center gap-2 hover:scale-[0.98] transition-transform border border-white/10">
              Start Your Journey
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Platform Stats - Bento Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 px-6 relative z-10">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -8 }} 
            className="relative overflow-hidden p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md group text-center flex flex-col justify-center items-center gap-4 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div>
              <h3 className="text-4xl font-black text-white tracking-tight">{stat.value}</h3>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Success Stories */}
      <section className="px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Inspirational <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Success Stories</span></h2>
          <p className="text-slate-400 text-lg">Real stories from real students who changed their lives.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            { name: 'Arjun Reddy', course: 'Web Development', role: 'SDE at Amazon', img: 'https://api.dicebear.com/5.x/initials/svg?seed=AR', text: 'I never thought I could switch from Mechanical to IT. This platform made it possible with hands-on projects.' },
            { name: 'Priya Das', course: 'Data Science', role: 'Data Analyst at Google', img: 'https://api.dicebear.com/5.x/initials/svg?seed=PD', text: 'The projects are identical to what I do now at my job. Truly practical and insightful learning experience.' },
            { name: 'Rahul Verma', course: 'Mobile Apps', role: 'Startup Founder', img: 'https://api.dicebear.com/5.x/initials/svg?seed=RV', text: 'Built my own app during the course and launched it on Play Store! The mentorship was invaluable.' }
          ].map((story, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              whileHover={{ y: -8 }}
              className="bg-white/[0.03] p-8 rounded-[2.5rem] space-y-6 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] transition-all duration-500 group border border-white/10 backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/30 rounded-full blur animate-pulse"></div>
                  <img src={story.img} alt={story.name} className="relative w-16 h-16 rounded-full border-2 border-white/20 group-hover:scale-105 transition-transform object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg tracking-wide">{story.name}</h4>
                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">{story.course}</p>
                </div>
              </div>
              <p className="text-slate-300 italic leading-relaxed relative z-10 flex-1">
                "{story.text}"
              </p>
              <div className="pt-6 border-t border-white/10 mt-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Role</span>
                <p className="text-white font-bold text-lg">{story.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Learning Paths */}
      <section className="px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Learning Paths</span></h2>
          <p className="text-slate-400 text-lg">Curated paths to take you from beginner to job-ready.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            { title: 'Full-Stack Web Dev', students: '45K+', level: 'Beginner to Pro', duration: '6 Months', skills: 'React, Node, SQL', color: 'from-blue-500/20 to-cyan-500/20' },
            { title: 'Data Science & ML', students: '32K+', level: 'Intermediate', duration: '8 Months', skills: 'Python, ML, AI', color: 'from-purple-500/20 to-pink-500/20' },
            { title: 'Mobile App Dev', students: '28K+', level: 'Beginner to Pro', duration: '5 Months', skills: 'Flutter, Firebase', color: 'from-emerald-500/20 to-teal-500/20' }
          ].map((path, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative bg-white/[0.02] p-8 rounded-[2.5rem] space-y-8 overflow-hidden group hover:border-white/30 transition-all duration-500 border border-white/10 backdrop-blur-md"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${path.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}></div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 tracking-wide group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">{path.title}</h3>
                <div className="space-y-4 text-sm bg-black/20 p-6 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-2"><i className="fas fa-users w-4"></i> Students</span> 
                    <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full">{path.students}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-2"><i className="fas fa-layer-group w-4"></i> Level</span> 
                    <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full">{path.level}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-2"><i className="fas fa-clock w-4"></i> Duration</span> 
                    <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full">{path.duration}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-6">
                  {path.skills.split(', ').map((skill, sIdx) => (
                    <span key={sIdx} className="bg-white/10 text-slate-200 text-xs font-bold px-4 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors shadow-sm">{skill}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-[3rem] p-12 md:p-20 text-center space-y-8 text-white border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/10 blur-[80px] -z-10"></div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Join <span className="text-cyan-400">150,000+</span> Learners Today</h2>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto font-medium">Master the skills that matter. Start your journey with the world's most advanced learning platform.</p>
          <div className="flex justify-center gap-4 pt-6">
            <Link to="/signup" className="group flex items-center gap-3 px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-100 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Start Learning Free <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );

  const renderStudentView = () => (
    <div className="space-y-12 relative z-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white/[0.03] backdrop-blur-md p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-8 border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10"></div>
        <div className="space-y-4 text-center md:text-left relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{user?.firstName || 'Student'}</span>! 👋</h1>
          <p className="text-slate-400 text-lg">You're on a <span className="text-white font-bold">5-day learning streak</span>. Keep the momentum going!</p>
          <div className="flex gap-4 pt-4 justify-center md:justify-start">
            <button className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-1">
              Resume Last Course
            </button>
            <Link to="/contact" className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
              Get Support
            </Link>
          </div>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 min-w-[120px] hover:bg-white/10 transition-colors">
            <p className="text-4xl font-black text-cyan-400">4</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Enrolled</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 min-w-[120px] hover:bg-white/10 transition-colors">
            <p className="text-4xl font-black text-purple-400">2</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Certificates</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Learning Dashboard</h2>
            <button className="text-sm font-bold text-cyan-400 hover:text-cyan-300">View All</button>
          </div>
          <div className="space-y-6">
            {[
              { title: 'Full Stack Web Development', progress: 65, lastActive: '2 hours ago', color: 'from-cyan-400 to-blue-500' },
              { title: 'Python for Data Science', progress: 30, lastActive: 'Yesterday', color: 'from-purple-400 to-pink-500' }
            ].map((course, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6 hover:bg-white/[0.04] hover:border-white/10 transition-all group backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">{course.title}</h3>
                  <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-white">{course.progress}% Completed</span>
                </div>
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden shadow-inner border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${course.progress}%` }} transition={{ duration: 1, delay: 0.2 }} className={`bg-gradient-to-r ${course.color} h-full rounded-full relative`}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                  </motion.div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="flex items-center gap-2"><i className="fas fa-clock"></i> Last active: {course.lastActive}</span>
                  <button className="text-cyan-400 font-bold hover:text-cyan-300 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Continue Learning <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Your Achievements</h2>
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-8 backdrop-blur-sm">
            <div className="space-y-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Badges</p>
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]" title="Top Performer">
                  <i className="fas fa-star"></i>
                </div>
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]" title="Active Learner">
                  <i className="fas fa-bolt"></i>
                </div>
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" title="Fast Learner">
                  <i className="fas fa-rocket"></i>
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-6 border-t border-white/5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance</p>
              <div className="space-y-4">
                <div className="flex justify-between text-sm items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-slate-300 font-medium">Quiz Scores</span>
                  <span className="font-bold text-cyan-400 text-lg">92%</span>
                </div>
                <div className="flex justify-between text-sm items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-slate-300 font-medium">Attendance</span>
                  <span className="font-bold text-emerald-400 text-lg">98%</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recommended for you</p>
              <div className="p-5 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
                <p className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wide">Based on Activity</p>
                <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Advanced React Design Patterns</h4>
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-1 group-hover:text-slate-300">
                  <i className="fas fa-play-circle"></i> Start Course
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeacherView = () => (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-900 text-white">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-bold">Welcome, Instructor {user?.firstName}! 🎓</h1>
          <p className="text-slate-400">Your teaching impact is growing. 120 new students joined today.</p>
          <div className="flex gap-4 pt-4 justify-center md:justify-start">
            <button className="btn-primary">View Full Analytics</button>
            <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold transition-all">Manage Students</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-6 bg-white/5 rounded-[2rem] border border-white/10 min-w-[140px]">
            <p className="text-3xl font-bold text-blue-400">12.5K</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Students</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-[2rem] border border-white/10 min-w-[140px]">
            <p className="text-3xl font-bold text-green-400">82%</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completion Rate</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Student Progress Overview</h2>
          <div className="space-y-6">
            {[
              { title: 'Mastering JavaScript ES6', students: 850, progress: 78 },
              { title: 'Node.js Backend Deep Dive', students: 420, progress: 62 }
            ].map((course, idx) => (
              <div key={idx} className="glass p-8 rounded-[2rem] space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">{course.title}</h3>
                  <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-bold">{course.students} Students</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Average Completion</span>
                    <span className="font-bold text-slate-900">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${course.progress}%` }} transition={{ duration: 1 }} className="bg-green-500 h-full rounded-full"></motion.div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Top Performing Students</h2>
          <div className="glass p-8 rounded-[2.5rem] space-y-6">
            {[
              { name: 'Alice Johnson', score: '98%', courses: 5, img: 'https://i.pravatar.cc/150?u=alice' },
              { name: 'David Smith', score: '96%', courses: 4, img: 'https://i.pravatar.cc/150?u=david' },
              { name: 'Emma Wilson', score: '95%', courses: 6, img: 'https://i.pravatar.cc/150?u=emma' }
            ].map((student, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <img src={student.img} alt={student.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{student.name}</h4>
                    <p className="text-xs text-slate-400">{student.courses} Courses Completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{student.score}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Score</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all mt-4">View All Students</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[#070B19] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#070B19] to-[#070B19] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {isLoggedIn ? (userRole === 'instructor' ? renderTeacherView() : renderStudentView()) : renderGuestStudents()}
        </motion.div>
      </div>
    </div>
  );
};

export default Students;
