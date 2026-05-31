import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Clock, Brain, Award, PlayCircle, Star, MessageSquare, Flame, Trophy, AlertCircle, Calendar, FileText } from 'lucide-react';
import { StatCard, GlassCard, ProgressBar, Badge } from '../../components/dashboard/Common';
import { supabase } from '../../config/supabaseClient';

const DashboardPage = () => {
  const { user } = useSelector((s) => s.profile);

  const firstName =
    (user?.full_name?.trim().split(' ')[0] || '') ||
    (user?.firstName?.trim() || '') ||
    (user?.first_name?.trim() || '') ||
    'Student';

  const [stats, setStats] = useState({
    activeCourses: 0,
    hoursStudied: 0,
    quizzesDone: 0,
    certificates: 0,
    assignmentsPending: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);

  React.useEffect(() => {
    if (user?.id) {
      const fetchDashboardData = async () => {
        try {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select(`
              id, enrolled_at, completed, progress, progress_percent,
              courses (
                id, title, final_thumbnail_url, youtube_thumbnail_url, thumbnail_url, thumbnail,
                instructor:instructor_id(first_name, last_name)
              )
            `)
            .eq("student_id", user.id)
            .order("enrolled_at", { ascending: false });

          if (enrollments) {
            const activeCoursesCount = enrollments.length;
            const completedCoursesCount = enrollments.filter(e => e.completed === true).length;
            
            const coursesList = [];
            enrollments.slice(0, 3).forEach(e => {
              const c = e.courses;
              if (!c) return;
              const inst = c.instructor || {};
              const thumb = c.final_thumbnail_url || c.youtube_thumbnail_url || c.thumbnail_url || c.thumbnail;
              coursesList.push({
                id: c.id,
                title: c.title || 'Course',
                thumbnail: thumb || 'https://via.placeholder.com/300x200',
                instructor: `${inst.first_name || ''} ${inst.last_name || ''}`.trim() || 'Instructor',
                category: 'Course',
                progress: e.completed ? 100 : (e.progress_percent || e.progress || 0)
              });
            });

            setRecentCourses(coursesList);
            setStats(prev => ({
              ...prev,
              activeCourses: activeCoursesCount,
              certificates: completedCoursesCount // using completed courses as proxy
            }));
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        }
      };
      fetchDashboardData();
    }
  }, [user]);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const todayIndex = (new Date().getDay() + 6) % 7;
  const chartHeights = [45, 90, 60, 120, 30, 75, 100];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-3 space-y-8">
        {/* Welcome Banner with Streak & XP */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-blue-600/20 border border-white/10 overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex-1">
              <p className="text-indigo-400 font-bold text-sm mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <h2 className="text-3xl font-bold text-white mb-4">
                {greeting}, <span className="capitalize">{firstName}</span>!
              </h2>
              <p className="text-gray-400 max-w-lg">You've completed 68% of your weekly goal. Keep the momentum going!</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Streak */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-white mt-2">7</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Day Streak</p>
              </div>
              {/* XP */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white mt-2">1,250</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">XP Points</p>
              </div>
              {/* Next Badge */}
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center w-24 h-24">
                  <svg width="100" height="100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (68/100)*251.2} strokeLinecap="round" className="text-indigo-500 transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-lg font-bold text-white">68%</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Next Badge</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Assignments Pending</p>
              <p className="text-2xl font-bold text-white">3</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Upcoming Live Class</p>
              <p className="text-2xl font-bold text-white">Tomorrow</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">New Notifications</p>
              <p className="text-2xl font-bold text-white">8</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Certificates Earned</p>
              <p className="text-2xl font-bold text-white">2</p>
            </div>
          </GlassCard>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Active Courses" value={stats.activeCourses.toString()} trend="Current enrollments" color="indigo" />
          <StatCard icon={Clock} label="Hours Studied" value={stats.hoursStudied.toString()} trend="This week" color="purple" />
          <StatCard icon={Brain} label="Quizzes Done" value={stats.quizzesDone.toString()} trend="Overall" color="blue" />
          <StatCard icon={Award} label="Certificates" value={stats.certificates.toString()} trend="Earned" color="emerald" />
        </div>

        {/* Weekly Chart */}
        <GlassCard>
          <h3 className="text-lg font-bold text-white mb-8">Weekly Activity</h3>
          <div className="flex items-end justify-between h-48 gap-2 px-2">
            {chartHeights.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="relative w-full flex justify-center items-end h-full">
                  <div 
                    className={`w-full max-w-[32px] bg-gradient-to-t from-indigo-600/20 to-indigo-500 rounded-t-lg transition-all duration-500 group-hover:to-purple-500 group-hover:shadow-lg group-hover:shadow-indigo-500/20 ${i === todayIndex ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-gray-950 shadow-lg shadow-indigo-500/40' : ''}`}
                    style={{ height: `${(h / 120) * 100}%` }}
                  />
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] px-2 py-1 rounded border border-white/10 whitespace-nowrap z-10">
                    {h} min
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase ${i === todayIndex ? 'text-indigo-400' : 'text-gray-500'}`}>{days[i]}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Continue Learning */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Continue Learning</h3>
            <button className="text-xs text-indigo-400 font-bold hover:underline">See All</button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {recentCourses.length > 0 ? recentCourses.map((course) => (
              <GlassCard key={course.id} className="min-w-[300px] flex-shrink-0 !p-0 overflow-hidden group">
                <div className="h-32 overflow-hidden relative">
                  <img src={course.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-3 left-3"><Badge text={course.category} color="indigo" /></div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-white line-clamp-1">{course.title}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">BY {course.instructor}</p>
                  <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>PROGRESS</span><span>{course.progress}%</span>
                  </div>
                  <div className="mt-2"><ProgressBar pct={course.progress} /></div>
                  <a href={`/learn/${course.id}`} className="block w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-700 py-2 rounded-xl text-xs font-bold text-center transition-all active:scale-95 text-white">Go To Classroom →</a>
                </div>
              </GlassCard>
            )) : (
              <div className="text-gray-400 p-4 border border-white/10 rounded-xl w-full text-center">
                You haven't enrolled in any courses yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="xl:col-span-1">
        <GlassCard className="h-full">
          <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {[
              { label: "Quiz completed", desc: "Scored 88% in React Hooks", time: "2h ago", icon: Brain, color: "text-blue-400" },
              { label: "Certificate earned", desc: "Tailwind CSS Mastery", time: "5h ago", icon: Award, color: "text-emerald-400" },
              { label: "Lecture watched", desc: "Custom Hooks in React", time: "1d ago", icon: PlayCircle, color: "text-purple-400" },
              { label: "Feedback submitted", desc: "UI/UX Foundations", time: "2d ago", icon: Star, color: "text-amber-400" },
              { label: "Message received", desc: "From Mr. Verma regarding quiz", time: "3d ago", icon: MessageSquare, color: "text-indigo-400" },
            ].map((act, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <act.icon className={`w-5 h-5 ${act.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{act.label}</h4>
                  <p className="text-xs text-gray-500 truncate">{act.desc}</p>
                  <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default DashboardPage;
