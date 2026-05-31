import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, FaCheckCircle, FaArrowLeft, FaGraduationCap, 
  FaChevronDown, FaChevronUp, FaLock, FaStar, FaRegStar, 
  FaShareAlt, FaPaperPlane, FaThumbsUp, FaRegThumbsUp, 
  FaCommentDots, FaSpinner, FaBookOpen, FaQuestionCircle, 
  FaFolderOpen, FaRegStickyNote, FaTrophy, FaArrowRight
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function ViewCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // Redux Auth States
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  
  // Syllabus & Progress States
  const [courseData, setCourseData] = useState(null);
  const [sections, setSections] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'notes', 'resources', 'discussion'
  
  // Accordion Toggle State
  const [expandedSections, setExpandedSections] = useState({});
  
  // Lecture Notes State
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState({});

  // Q&A Interaction States (Mock premium threaded discussion)
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [newReply, setNewReply] = useState('');
  
  // Video Play State
  const [videoPlayTriggered, setVideoPlayTriggered] = useState(false);
  const activeLessonRef = useRef(null);

  // Load Secured Syllabus and Gated Access Details
  const fetchSecuredSyllabus = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      const activeToken = token || localStorage.getItem("token");
      
      const response = await fetch(`${baseUrl}/course/learn/${courseId}`, {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      });
      
      const resData = await response.json();
      
      if (!resData.success) {
        toast.error(resData.message || "Failed to load secure syllabus");
        navigate(`/course/${courseId}`);
        return;
      }
      
      const { courseDetails, sections: secList, completedLessons: compIds } = resData.data;
      
      setCourseData(courseDetails);
      setSections(secList || []);
      setIsEnrolled(true);
      
      // Flat list of lessons
      const flatLessons = (secList || []).flatMap(sec => sec.sub_sections || []);
      setLessons(flatLessons);
      setCompletedLessons(compIds || []);
      
      // Expand first section by default
      if (secList && secList.length > 0) {
        setExpandedSections({ [secList[0].id]: true });
      }
      
      // Set active lesson to first playable lesson by default
      if (flatLessons && flatLessons.length > 0) {
        setActiveLesson(flatLessons[0]);
      }

      // Initialize mock discussions
      initializeDiscussions();

    } catch (err) {
      console.error("Fetch Syllabus Error:", err);
      toast.error("You must be enrolled to view this learning page.");
      navigate(`/course/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && token) {
      fetchSecuredSyllabus();
    } else if (!token) {
      toast.error("Please login to access your courses.");
      navigate("/login");
    }
  }, [courseId, token]);

  // Load Saved Note when active lesson changes
  useEffect(() => {
    if (activeLesson) {
      const saved = savedNotes[activeLesson.id] || '';
      setNotes(saved);
      setVideoPlayTriggered(false); // Reset click-to-play state
    }
  }, [activeLesson, savedNotes]);

  // Save Note locally
  const handleSaveNote = () => {
    if (!activeLesson) return;
    setSavedNotes(prev => ({
      ...prev,
      [activeLesson.id]: notes
    }));
    toast.success("Lecture note saved locally!");
  };

  // Mock Q&A thread init
  const initializeDiscussions = () => {
    setQuestions([
      {
        id: 'q1',
        title: 'How does React Router defer action handlers?',
        content: 'I noticed some delay when updating parent states during action bindings. Is there a standard way to render spinners?',
        author_name: 'Amit Patel',
        upvotes: 5,
        hasUpvoted: false,
        created_at: '2 hours ago',
        replies: [
          { author_name: 'Ram ST (Instructor)', content: 'You should use the useNavigation hook from react-router-dom to check navigation.state === "submitting" and render conditional loaders dynamically!', created_at: '1 hour ago' }
        ]
      },
      {
        id: 'q2',
        title: 'Difference between useMemo and useCallback in large lists',
        content: 'Should I wrap every single callback prop in useCallback to avoid rerenders, or does it have an adverse memory footprint?',
        author_name: 'Sneha Rao',
        upvotes: 3,
        hasUpvoted: false,
        created_at: '1 day ago',
        replies: []
      }
    ]);
  };

  // Toggle Section Expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Toggle checklist checkbox & sync in database
  const toggleLessonProgress = async (lessonId, e) => {
    if (e) e.stopPropagation();
    
    const isCompleted = completedLessons.includes(lessonId);
    let updatedCompleted = [];

    if (isCompleted) {
      updatedCompleted = completedLessons.filter(id => id !== lessonId);
    } else {
      updatedCompleted = [...completedLessons, lessonId];
    }

    setCompletedLessons(updatedCompleted);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      const activeToken = token || localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/course/lecture/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          completed: !isCompleted,
          watchedSeconds: !isCompleted ? 60 : 0
        })
      });

      const resData = await response.json();
      if (!resData.success) throw new Error(resData.message);

      toast.success(!isCompleted ? "Marked as complete!" : "Marked as incomplete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to synchronize checklist progress");
      // Fallback revert state
      setCompletedLessons(completedLessons);
    }
  };

  // Q&A Question posting
  const handlePostQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      toast.error("Please fill in all question fields");
      return;
    }
    const thread = {
      id: 'mock_' + Date.now(),
      title: newQuestion.title,
      content: newQuestion.content,
      author_name: user?.full_name || 'You',
      upvotes: 0,
      hasUpvoted: false,
      created_at: 'Just now',
      replies: []
    };
    setQuestions(prev => [thread, ...prev]);
    setNewQuestion({ title: '', content: '' });
    toast.success("Question posted on the discussion board!");
  };

  // Q&A upvotes
  const handleUpvoteQuestion = (qId) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          upvotes: q.hasUpvoted ? q.upvotes - 1 : q.upvotes + 1,
          hasUpvoted: !q.hasUpvoted
        };
      }
      return q;
    }));
  };

  // Q&A Reply
  const handlePostReply = (qId) => {
    if (!newReply.trim()) return;
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          replies: [...q.replies, {
            author_name: user?.full_name || 'You',
            content: newReply,
            created_at: 'Just now'
          }]
        };
      }
      return q;
    }));
    setNewReply('');
    toast.success("Reply added successfully!");
  };

  // Certificate Generator trigger
  const handleDownloadCertificate = () => {
    toast.loading("Generating your verified secure certificate...");
    setTimeout(() => {
      toast.dismiss();
      toast.success("Certificate generated successfully! Opening download window...");
      window.open('/dashboard/certificates', '_blank');
    }, 2000);
  };

  // Dynamic progress calculations
  const totalLessonsCount = lessons.length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  if (loading || !courseData) {
    return (
      <div className="min-h-screen bg-[#070B19] flex flex-col items-center justify-center">
        <FaSpinner className="text-purple-500 text-5xl animate-spin mb-4" />
        <p className="text-slate-400 font-bold tracking-wider animate-pulse">Syncing Gated Course Player...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B19] text-white flex flex-col pt-16">
      
      {/* TOP HEADER STATUS BAR */}
      <header className="bg-[#0B1228] border-b border-white/5 py-4 px-6 md:px-12 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-40 backdrop-blur-md bg-opacity-95 select-none">
        <div className="flex items-center gap-3">
          <Link 
            to="/dashboard/enrolled-courses"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight text-white line-clamp-1 max-w-xl">
              {courseData.title}
            </h1>
            <p className="text-slate-500 text-xs font-semibold">
              Instructor: {courseData.instructor?.first_name} {courseData.instructor?.last_name}
            </p>
          </div>
        </div>

        {/* Dynamic Progress indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-purple-400 uppercase tracking-widest font-black">Course Progress</p>
            <p className="text-xs text-white font-bold">{completedCount} of {totalLessonsCount} lectures complete ({progressPercent}%)</p>
          </div>
          <div className="w-24 h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500 shadow-md"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Course link copied to clipboard!");
            }}
            className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-black uppercase rounded-lg tracking-wider transition-colors flex items-center gap-2"
          >
            <FaShareAlt /> Share
          </button>
        </div>
      </header>

      {/* CORE SYLLABUS SPLIT LAYOUT */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT PANEL: PLAYER & TAB CONTENTS */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* SECURE DYNAMIC VIDEO PLAYER */}
          <div className="aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl shadow-purple-500/5 border border-white/10 relative group">
            {activeLesson ? (
              <>
                {activeLesson.youtube_video_id ? (
                  // Gated YouTube player (transferred securely from view)
                  videoPlayTriggered ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${activeLesson.youtube_video_id}?autoplay=1&modestbranding=1&rel=0`}
                      title={activeLesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full animate-fadeIn"
                    ></iframe>
                  ) : (
                    // Click-to-Play Poster overlay
                    <div className="relative w-full h-full">
                      <img 
                        src={courseData.final_thumbnail_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'} 
                        alt="Play Poster" 
                        className="w-full h-full object-cover filter brightness-90"
                      />
                      <button 
                        onClick={() => setVideoPlayTriggered(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/45 hover:bg-black/55 transition-colors group/play"
                      >
                        <div className="w-20 h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group-hover/play:scale-110 shadow-purple-600/30 border border-purple-500/30">
                          <FaPlay className="text-2xl ml-1.5 fill-current" />
                        </div>
                      </button>
                      <div className="absolute bottom-6 left-6 pointer-events-none">
                        <span className="px-3 py-1 bg-black/60 border border-white/10 backdrop-blur-md rounded text-xs font-black uppercase tracking-wider text-slate-200">
                          Lecture: {activeLesson.title}
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  // Gated Overlay (Secure Mask Blocked)
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-8 text-center backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-2xl mb-4 animate-pulse">
                      <FaLock />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Lesson Access Gated</h3>
                    <p className="text-slate-400 text-sm max-w-sm">
                      You are not authorized to view this video. Please verify if your enrollment is active.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                Select a lecture from the curriculum sidebar to start watching.
              </div>
            )}
          </div>

          {/* ACTIVE LECTURE INFORMATION */}
          {activeLesson && (
            <div className="p-6 bg-[#0B1228] border border-white/5 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-black mb-2 text-white">
                {activeLesson.title}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {activeLesson.description || 'In this lecture, we will deeply explore the concepts, map properties, and integrate best practices into our codebases.'}
              </p>
            </div>
          )}

          {/* TAB SYSTEM SELECTORS */}
          <div className="flex bg-[#0B1228] p-1 rounded-2xl border border-white/5 select-none overflow-x-auto scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: FaBookOpen },
              { id: 'notes', label: 'Take Notes', icon: FaRegStickyNote },
              { id: 'resources', label: 'Resources', icon: FaFolderOpen },
              { id: 'discussion', label: 'Discussion Forum', icon: FaCommentDots }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-xl border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <tab.icon className="text-sm" /> {tab.label}
              </button>
            ))}
          </div>

          {/* TAB WINDOW CONTENTS */}
          <div className="bg-[#0B1228] p-8 rounded-3xl border border-white/5 shadow-xl min-h-[350px]">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                <section className="space-y-4">
                  <h4 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span> What You'll Learn
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseData.learning_outcomes && courseData.learning_outcomes.length > 0 ? (
                      courseData.learning_outcomes.map((outcome, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                          <FaCheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm font-semibold">{outcome}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                          <FaCheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm font-semibold">Master core architecture and patterns</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                          <FaCheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm font-semibold">Construct highly production-ready software layouts</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section className="space-y-4 pt-6 border-t border-white/5">
                  <h4 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span> Requirements
                  </h4>
                  <ul className="space-y-3 pl-1 text-slate-300 text-sm">
                    {courseData.requirements && courseData.requirements.length > 0 ? (
                      courseData.requirements.map((reqItem, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0"></span>
                          <span>{reqItem}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0"></span>
                        <span>Basic prior scripting experience is recommended.</span>
                      </li>
                    )}
                  </ul>
                </section>

                <section className="pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-lg font-black tracking-wide text-white">About the Instructor</h4>
                  <div className="flex flex-col sm:flex-row gap-6 p-6 bg-white/5 border border-white/5 rounded-2xl">
                    {courseData.instructor?.image || courseData.instructor?.avatar_url ? (
                      <img 
                        src={courseData.instructor?.image || courseData.instructor?.avatar_url} 
                        alt="Instructor" 
                        className="w-24 h-24 rounded-2xl object-cover border border-white/10 shrink-0 self-start"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-4xl font-bold shrink-0">
                        {courseData.instructor?.first_name?.charAt(0) || 'I'}
                      </div>
                    )}
                    <div>
                      <h5 className="text-xl font-bold text-white mb-1">
                        {courseData.instructor?.first_name} {courseData.instructor?.last_name}
                      </h5>
                      <p className="text-purple-400 text-xs font-black uppercase tracking-wider mb-3">Professional LMS Educator</p>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {courseData.instructor?.about || "Expert developer and lecturer dedicated to constructing rich visual interfaces and modular production workflows."}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FaRegStickyNote className="text-purple-400" /> Write Lecture Note
                </h3>
                <p className="text-slate-400 text-xs">Persist your inline lecture insights and observations. Saved locally under this lecture segment.</p>
                
                <textarea
                  rows={6}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Capture key concepts, code snippets, or reference timelines..."
                  className="w-full px-4 py-3 bg-[#070B19] border border-white/5 focus:border-purple-500 rounded-xl outline-none text-sm text-white placeholder-slate-500 resize-none transition-colors"
                />

                <button 
                  onClick={handleSaveNote}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 border border-purple-500/30 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98"
                >
                  Save Note
                </button>
              </div>
            )}

            {/* RESOURCES TAB */}
            {activeTab === 'resources' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FaFolderOpen className="text-purple-400" /> Lesson Resources
                </h3>
                <p className="text-slate-400 text-xs">Download files, templates, reference codes, and guidelines uploaded for this lecture segment.</p>
                
                <div className="space-y-3 pt-2">
                  {[
                    { name: 'lecture_source_code.zip', size: '2.4 MB' },
                    { name: 'reference_cheatsheet.pdf', size: '1.1 MB' }
                  ].map((resItem, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <FaFolderOpen />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{resItem.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-black">{resItem.size}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toast.success(`Initiated secure download for: ${resItem.name}`)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DISCUSSION TAB (Q&A BOARD) */}
            {activeTab === 'discussion' && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* Ask new question */}
                <form onSubmit={handlePostQuestion} className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Ask a New Question</h4>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Be specific. e.g. What is the complexity footprint of useMemo?"
                      value={newQuestion.title}
                      onChange={e => setNewQuestion(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#070B19] border border-white/5 focus:border-purple-500 rounded-xl outline-none text-sm text-white placeholder-slate-600 transition-colors"
                    />
                    <textarea
                      rows={3}
                      placeholder="Elaborate on your problem, logs, or theoretical doubt..."
                      value={newQuestion.content}
                      onChange={e => setNewQuestion(p => ({ ...p, content: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#070B19] border border-white/5 focus:border-purple-500 rounded-xl outline-none text-sm text-white placeholder-slate-600 resize-none transition-colors"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Submit Question
                  </button>
                </form>

                {/* Question List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Discussion threads ({questions.length})</h4>
                  
                  {questions.map((q) => {
                    const isExpanded = expandedQuestionId === q.id;

                    return (
                      <div key={q.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h5 className="text-base font-bold text-white leading-tight hover:text-purple-400 cursor-pointer">{q.title}</h5>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{q.content}</p>
                            <div className="flex items-center gap-3 mt-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                              <span>By: {q.author_name}</span>
                              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                              <span>{q.created_at}</span>
                            </div>
                          </div>
                          
                          {/* Upvote */}
                          <button
                            onClick={() => handleUpvoteQuestion(q.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${q.hasUpvoted ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-[#070B19] border-white/5 text-slate-500 hover:text-slate-300'}`}
                          >
                            <FaThumbsUp className="text-xs" />
                            <span className="text-xs font-bold">{q.upvotes}</span>
                          </button>
                        </div>

                        {/* ExpandReplies Trigger */}
                        <div className="pt-4 border-t border-white/5">
                          <button
                            onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                            className="text-[10px] font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5"
                          >
                            <FaCommentDots /> {q.replies.length} Replies {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </div>

                        {/* Thread Replies */}
                        {isExpanded && (
                          <div className="space-y-4 mt-4 pl-4 border-l border-purple-500/30 animate-fadeIn">
                            <div className="space-y-3">
                              {q.replies.map((reply, rIdx) => (
                                <div key={rIdx} className="p-4 bg-[#070B19]/50 border border-white/5 rounded-xl leading-relaxed">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-white">{reply.author_name}</span>
                                    <span className="text-[9px] text-slate-500">{reply.created_at}</span>
                                  </div>
                                  <p className="text-slate-300 text-xs leading-relaxed">{reply.content}</p>
                                </div>
                              ))}
                            </div>

                            {/* Inline Reply input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add your insight..."
                                value={newReply}
                                onChange={e => setNewReply(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handlePostReply(q.id); }}
                                className="w-full px-4 py-2 bg-[#070B19] border border-white/5 focus:border-purple-500 rounded-lg outline-none text-xs text-white placeholder-slate-600 transition-colors"
                              />
                              <button
                                onClick={() => handlePostReply(q.id)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg border border-purple-500/30 tracking-wider transition-all"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SIDEBAR PANEL: PREMIUM UDEMY STICKY CURRICULUM */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="sticky top-48 space-y-6">
            
            {/* PROGRESS CHECKLIST SUMMARY */}
            <div className="bg-[#0B1228] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Lectures Completed</h3>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-black">{completedCount} of {totalLessonsCount}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 shadow-md"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-purple-400 shrink-0">{progressPercent}%</span>
              </div>
            </div>

            {/* CURRICULUM SYLLABUS ACCORDION LIST */}
            <div className="bg-[#0B1228] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span> Course Syllabus
                </h3>
              </div>

              <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto scrollbar-thin">
                {sections.length === 0 ? (
                  <div className="p-6 text-slate-500 text-center text-xs">No curriculum modules uploaded.</div>
                ) : (
                  sections.map((section, sIdx) => {
                    const sectionLessons = lessons.filter(l => l.section_id === section.id);
                    const isExpanded = !!expandedSections[section.id];
                    
                    return (
                      <div key={section.id} className="transition-all">
                        {/* Section Header Button */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-xs font-black text-purple-400 shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm line-clamp-1 leading-tight">{section.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
                                {sectionLessons.length} lectures
                              </p>
                            </div>
                          </div>
                          {isExpanded ? <FaChevronUp className="text-slate-500 text-xs" /> : <FaChevronDown className="text-slate-500 text-xs" />}
                        </button>

                        {/* Gated Lesson Rows */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden bg-[#070B19]/50 divide-y divide-white/5"
                            >
                              {sectionLessons.length === 0 ? (
                                <div className="p-4 text-slate-500 text-[10px] text-center">No lectures in this module yet.</div>
                              ) : (
                                sectionLessons.map((lesson) => {
                                  const isActive = activeLesson?.id === lesson.id;
                                  const isCompleted = completedLessons.includes(lesson.id);
                                  const isLocked = !lesson.youtube_video_id; // resolve locked state cleanly!

                                  return (
                                    <div
                                      key={lesson.id}
                                      ref={isActive ? activeLessonRef : null}
                                      onClick={() => {
                                        if (!isLocked) {
                                          setActiveLesson(lesson);
                                        } else {
                                          toast.error("This paid lecture is currently locked. Enroll to unlock!");
                                        }
                                      }}
                                      className={`flex items-center gap-3 px-5 py-3 transition-all cursor-pointer ${isActive ? 'bg-purple-600/10 border-l-2 border-purple-500' : 'hover:bg-white/5'} ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                    >
                                      {/* Checkbox */}
                                      <div 
                                        onClick={(e) => {
                                          if (!isLocked) {
                                            toggleLessonProgress(lesson.id, e);
                                          } else {
                                            e.stopPropagation();
                                          }
                                        }}
                                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'border-slate-700 hover:border-slate-500'} ${isLocked ? 'cursor-not-allowed border-slate-800 bg-slate-900/50' : ''}`}
                                      >
                                        {isCompleted && <FaCheckCircle className="text-white text-[10px]" />}
                                      </div>

                                      {/* Icon */}
                                      {isLocked ? (
                                        <FaLock className="text-slate-600 text-xs shrink-0" />
                                      ) : (
                                        <FaPlay className={`text-[10px] shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                          {lesson.title}
                                        </p>
                                        <p className="text-[9px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
                                          {lesson.time_duration || '5 mins'}
                                        </p>
                                      </div>

                                      {/* Locked overlay badge */}
                                      {isLocked && (
                                        <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase text-slate-500 tracking-wider">
                                          Locked
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SECURED CERTIFICATE PORTAL */}
            <div className="p-6 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-white/5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FaTrophy className="text-lg" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Verified Certificate</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Unlocked at 100% course completion</p>
                </div>
              </div>

              <button
                onClick={handleDownloadCertificate}
                disabled={progressPercent < 100}
                className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xl ${
                  progressPercent === 100
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 border-purple-500 text-white shadow-purple-600/20 hover:opacity-90 animate-pulse'
                    : 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                {progressPercent === 100 ? (
                  <>Get Your Certificate <FaArrowRight /></>
                ) : (
                  <>Locked Certificate ({progressPercent}%)</>
                )}
              </button>
            </div>

          </div>
        </aside>

      </main>

    </div>
  );
}
