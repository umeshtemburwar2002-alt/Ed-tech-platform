import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LogoMark from "../../../components/ui/LogoMark";
import {
  LayoutDashboard, BookOpen, PlusCircle, ClipboardList, HelpCircle,
  FileText, Users, MessageSquare, Video, Globe, BarChart2, DollarSign,
  Tag, Star, Bell, FolderOpen, Award, Bot, Share2, Settings,
  LogOut, ChevronRight, Menu, X, Shield, CalendarCheck, User
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard",        label: "Dashboard",        icon: LayoutDashboard, path: "/dashboard/instructor" },
  { id: "my-data",          label: "My Data",          icon: User,            path: "/instructor/setup" },
  { id: "instructor-info",  label: "Instructor Info",  icon: User,            path: "/dashboard/instructor/info" },
  { id: "create-course",    label: "Create Course",     icon: PlusCircle,      path: "/dashboard/instructor/add-course" },
  { id: "my-courses",       label: "My Courses",        icon: BookOpen,        path: "/dashboard/instructor/my-courses" },
  { id: "categories",       label: "Categories",        icon: Tag,             path: "/dashboard/instructor/categories" },
  { id: "course-builder",   label: "Course Builder",    icon: FileText,        path: "/dashboard/instructor/course-builder" },
  { id: "course-analytics", label: "Course Analytics",  icon: BarChart2,       path: "/dashboard/instructor/analytics" },
  { id: "students",         label: "Students",          icon: Users,           path: "/dashboard/instructor/student-progress" },
  { id: "enrollments",      label: "Enrollments",       icon: ClipboardList,   path: "/dashboard/instructor/enrollments" },
  { id: "assignments",      label: "Assignments",       icon: ClipboardList,   path: "/dashboard/instructor/assignments" },
  { id: "quizzes",          label: "Quizzes",           icon: HelpCircle,      path: "/dashboard/instructor/quizzes" },
  { id: "certificates",     label: "Certificates",      icon: Award,           path: "/dashboard/instructor/certificates" },
  { id: "live-classes",     label: "Live Classes",      icon: Video,           path: "/dashboard/instructor/live-classes" },
  { id: "messages",         label: "Messages",          icon: MessageSquare,   path: "/dashboard/instructor/messages" },
  { id: "community",        label: "Community",         icon: Users,           path: "/students" },
  { id: "discussion-management", label: "Discussion Management", icon: MessageSquare, path: "/dashboard/instructor/discussions" },
  { id: "ai-tools",         label: "AI Tools",          icon: Bot,             path: "/dashboard/instructor/ai-assistant", highlight: true },
  { id: "revenue-earnings", label: "Revenue & Earnings", icon: DollarSign,     path: "/dashboard/instructor/earnings" },
  { id: "payouts",          label: "Payouts",           icon: DollarSign,      path: "/dashboard/instructor/payouts" },
  { id: "coupons-marketing", label: "Coupons & Marketing", icon: Tag,          path: "/dashboard/instructor/coupons" },
  { id: "affiliates",       label: "Affiliates",        icon: Share2,          path: "/dashboard/instructor/affiliate" },
  { id: "reports",          label: "Reports",           icon: BarChart2,       path: "/dashboard/instructor/reports" },
  { id: "downloads",        label: "Downloads",         icon: FolderOpen,      path: "/dashboard/instructor/downloads" },
  { id: "jobs-hiring",      label: "Jobs & Hiring",     icon: Users,           path: "/dashboard/instructor/jobs" },
  { id: "announcements",    label: "Announcements",     icon: Bell,            path: "/dashboard/instructor/announcements" },
  { id: "notifications",    label: "Notifications",     icon: Bell,            path: "/dashboard/instructor/notifications", badge: 3 },
  { id: "support-tickets",  label: "Support Tickets",   icon: HelpCircle,      path: "/dashboard/instructor/support" },
  { id: "reviews-ratings",  label: "Reviews & Ratings", icon: Star,            path: "/dashboard/instructor/reviews" },
  { id: "content-library",  label: "Content Library",   icon: FolderOpen,      path: "/dashboard/instructor/resources" },
  { id: "calendar",         label: "Calendar",          icon: CalendarCheck,   path: "/dashboard/instructor/calendar" },
  { id: "integrations",     label: "Integrations",      icon: Globe,           path: "/dashboard/instructor/integrations" },
  { id: "verification-kyc", label: "Verification & KYC", icon: Shield,          path: "/dashboard/instructor/verification" },
  { id: "subscription-billing", label: "Subscription & Billing", icon: DollarSign, path: "/dashboard/instructor/billing" },
  { id: "settings",         label: "Settings",          icon: Settings,        path: "/dashboard/instructor/settings" },
];

export default function InstructorSidebar() {
  const { user } = useSelector((state) => state.profile);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const { performLogout } = await import("../../../services/syncSupabaseSession");
    await performLogout(dispatch, navigate);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.08]">
        <Link to="/" className="flex items-center">
          <LogoMark />
        </Link>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 ml-1">Instructor Portal</p>
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <img
            src={user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName || "I"}&backgroundColor=6366f1`}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover border border-white/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.firstName || "Instructor"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
          </div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === "dashboard"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-violet-600/25 to-cyan-600/10 text-white border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                  : item.highlight
                  ? "text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 border border-transparent hover:border-cyan-500/20"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-all ${
                      isActive ? "text-violet-400" : item.highlight ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  <span className="text-[13px] font-semibold whitespace-nowrap">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-violet-400" />}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-[13px] font-semibold">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 h-full bg-[#080c14]/95 backdrop-blur-xl border-r border-white/[0.07] overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-[110] w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-600 text-white rounded-2xl shadow-2xl flex items-center justify-center border border-white/20"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-[110] w-[240px] bg-[#080c14]/98 backdrop-blur-xl border-r border-white/[0.07] overflow-hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
