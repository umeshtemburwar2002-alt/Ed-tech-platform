import React, { useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LogoMark from "../../../components/ui/LogoMark";
import { 
  FaHome, 
  FaBook, 
  FaUser, 
  FaBell, 
  FaQuestionCircle, 
  FaChartLine,
  FaTrophy,
  FaChevronRight,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaCommentDots,
  FaStar,
  FaKeyboard,
  FaClipboardList,
  FaBrain,
  FaCalendarAlt,
  FaBookmark,
  FaMedal,
  FaUsers,
  FaFolderOpen,
  FaGift,
  FaCog,
  FaHistory
} from "react-icons/fa";

const sidebarLinks = [
  { id: "dashboard", label: "Dashboard", icon: FaHome, path: "/dashboard/my-profile" },
  { id: "my-learning", label: "My Learning", icon: FaBook, path: "/dashboard/enrolled-courses" },
  { id: "explore-courses", label: "Explore Courses", icon: FaBook, path: "/course-catalog" },
  { id: "learning-roadmaps", label: "Learning Roadmaps", icon: FaChartLine, path: "/dashboard/learning-path" },
  { id: "purchase-history", label: "My Purchases", icon: FaHistory, path: "/dashboard/purchase-history" },
  { id: "wishlist", label: "Wishlist", icon: FaStar, path: "/dashboard/wishlist" },
  { id: "assignments", label: "Assignments", icon: FaClipboardList, path: "/dashboard/assignments" },
  { id: "quizzes", label: "Quizzes", icon: FaKeyboard, path: "/dashboard/quizzes" },
  { id: "certificates", label: "Certificates", icon: FaTrophy, path: "/dashboard/certificates" },
  { id: "achievements", label: "Achievements", icon: FaMedal, path: "/dashboard/achievements" },
  { id: "notes", label: "Notes", icon: FaBookmark, path: "/dashboard/notes" },
  { id: "bookmarks", label: "Bookmarks", icon: FaBookmark, path: "/dashboard/bookmarks" },
  { id: "messages", label: "Messages", icon: FaCommentDots, path: "/dashboard/messages" },
  { id: "live-classes", label: "Live Classes", icon: FaUsers, path: "/dashboard/live-classes" },
  { id: "community", label: "Community", icon: FaUsers, path: "/students" },
  { id: "discussion-forums", label: "Discussion Forums", icon: FaCommentDots, path: "/dashboard/forums" },
  { id: "leaderboard", label: "Leaderboard", icon: FaTrophy, path: "/dashboard/leaderboard" },
  { id: "calendar", label: "Calendar", icon: FaCalendarAlt, path: "/dashboard/calendar" },
  { id: "downloads", label: "Downloads", icon: FaFolderOpen, path: "/dashboard/downloads" },
  { id: "interview-prep", label: "Interview Prep", icon: FaQuestionCircle, path: "/dashboard/interview-prep" },
  { id: "jobs-internships", label: "Jobs & Internships", icon: FaUser, path: "/dashboard/jobs" },
  { id: "resume-builder", label: "Resume Builder", icon: FaClipboardList, path: "/dashboard/resume" },
  { id: "ai-assistant", label: "AI Assistant", icon: FaBrain, path: "/dashboard/ai-assistant" },
  { id: "ai-study-planner", label: "AI Study Planner", icon: FaCalendarAlt, path: "/dashboard/planner" },
  { id: "analytics", label: "Analytics", icon: FaChartLine, path: "/dashboard/analytics" },
  { id: "notifications", label: "Notifications", icon: FaBell, path: "/dashboard/notifications" },
  { id: "support", label: "Support", icon: FaQuestionCircle, path: "/dashboard/support" },
  { id: "subscription-billing", label: "Subscription & Billing", icon: FaCog, path: "/dashboard/billing" },
  { id: "settings", label: "Settings", icon: FaCog, path: "/dashboard/settings" },
];

export default function StudentSidebar() {
  const { user } = useSelector((state) => state.profile);
  const [isOpen, setIsOpen] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const dropdownVariants = {
    closed: { 
      maxHeight: 0, 
      opacity: 0,
      y: -8,
      scaleY: 0.95,
      transition: { duration: 0.18, ease: "easeInOut", when: "afterChildren" }
    },
    open: { 
      maxHeight: "200px", 
      opacity: 1,
      y: 0,
      scaleY: 1,
      transition: { duration: 0.18, ease: "easeOut", staggerChildren: 0.05, when: "beforeChildren" }
    }
  };

  const subItemVariants = {
    closed: { x: -8, opacity: 0 },
    open: { x: 0, opacity: 1 }
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[110] w-14 h-14 bg-cyan-500 text-white rounded-2xl shadow-2xl flex items-center justify-center text-xl border border-cyan-400/50"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar Container */}
      <motion.aside
        initial={{ scale: 1.02, opacity: 0 }}
        animate={{ 
          width: isOpen ? "280px" : "0px",
          x: isOpen ? 0 : -280,
          scale: 1,
          opacity: 1
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed lg:relative z-[100] h-full flex flex-col overflow-hidden transition-all duration-300 lg:translate-x-0 shrink-0 border-r border-white/10 relative`}
      >
        {/* Background Image with Overlay and Blur */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
            alt="Sidebar Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[6px]" />
        </div>

        {/* Content Wrapper (Ensures content is above BG) */}
        <div className="relative z-10 flex flex-col h-full bg-black/40">
          {/* Header/Logo with localized Background */}
          <div className="relative p-8 border-b border-white/10 overflow-hidden group/header">
            {/* Header specific background image */}
            <div className="absolute inset-0 z-0 opacity-20 group-hover/header:opacity-40 transition-opacity duration-500">
              <img 
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Header BG" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
            </div>

            <Link to="/" className="relative z-10 flex items-center">
              <LogoMark />
            </Link>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Student Portal</p>
          </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((link) => (
            <div
              key={link.id}
              className="relative"
              onMouseEnter={() => {
                if (link.subItems && !isOpen) {
                  setOpenDropdown(link.id);
                }
              }}
              onMouseLeave={() => {
                if (link.subItems) {
                  setOpenDropdown(null);
                }
              }}
            >
              {link.subItems ? (
                <button
                  onClick={() => toggleDropdown(link.id)}
                  className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                    openDropdown === link.id
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,180,216,0.1)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="text-lg" />
                    <span className="text-sm font-bold tracking-wide whitespace-nowrap">{link.label}</span>
                  </div>
                  <FaChevronDown className={`text-[10px] transition-all duration-300 ${
                    openDropdown === link.id ? "rotate-180 text-cyan-400" : "text-slate-500"
                  }`} />
                </button>
              ) : (
                <NavLink
                  to={link.path}
                  onClick={() => setOpenDropdown(null)}
                  className={({ isActive }) => `w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,180,216,0.1)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="text-lg" />
                    <span className="text-sm font-bold tracking-wide whitespace-nowrap">{link.label}</span>
                  </div>
                  <FaChevronRight className={`text-[8px] transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-1`} />
                </NavLink>
              )}

              {/* Sub-items with Optimized Animation */}
              <AnimatePresence initial={false}>
                {link.subItems && openDropdown === link.id && (
                  <motion.div
                    key={link.id}
                    variants={dropdownVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    style={{ transformOrigin: "top", willChange: "transform, opacity", transform: "translateZ(0)" }}
                    className="overflow-hidden flex flex-col pl-11 space-y-1"
                  >
                    {link.subItems.map((sub) => (
                      <NavLink
                        key={sub.id}
                        to={sub.path}
                        className={({ isActive }) => `w-full text-left py-2 px-4 rounded-lg text-xs font-bold transition-all duration-300 border-l-2 ${
                          isActive
                            ? "text-cyan-400 border-cyan-500 bg-cyan-500/5"
                            : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

      </div>
    </motion.aside>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
    </>
  );
}
