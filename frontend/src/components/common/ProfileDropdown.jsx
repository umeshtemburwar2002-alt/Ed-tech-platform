import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSignOutAlt, FaUser, FaChalkboardTeacher, FaShieldAlt, FaEnvelope } from 'react-icons/fa';

// ── Role display config ────────────────────────────────────────────────────────
// Maps profile.account_type → { label, color, icon, dashboardPath }
const ROLE_CONFIG = {
  Instructor: {
    label: 'Instructor Account',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-400',
    icon: FaChalkboardTeacher,
    dashboardPath: '/dashboard/instructor',
  },
  Admin: {
    label: 'Admin Account',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
    icon: FaShieldAlt,
    dashboardPath: '/admin/dashboard',
  },
  Student: {
    label: 'Student Account',
    color: 'text-[#00B4D8]',
    bg: 'bg-[#00B4D8]/10',
    dot: 'bg-[#00B4D8]',
    icon: FaUser,
    dashboardPath: '/dashboard/my-profile',
  },
};

// Fallback for null / unexpected values
const DEFAULT_ROLE = ROLE_CONFIG.Student;

/**
 * Get role config from any account_type string (case-insensitive).
 * Handles "Student", "student", "Instructor", "instructor", "teacher", etc.
 */
function getRoleConfig(accountType) {
  if (!accountType) return DEFAULT_ROLE;
  const lower = accountType.toLowerCase();
  if (lower === 'instructor' || lower === 'teacher') return ROLE_CONFIG.Instructor;
  if (lower === 'admin') return ROLE_CONFIG.Admin;
  return ROLE_CONFIG.Student;
}

// ── Component ─────────────────────────────────────────────────────────────────
const ProfileDropdown = ({ isOpen, onClose, user, handleLogout }) => {
  const role = getRoleConfig(user?.accountType);
  const RoleIcon = role.icon;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'User';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute top-full right-0 w-68 min-w-[260px] bg-black/[0.6] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden z-[110] mt-2"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.image ||
                  user?.avatar_url ||
                  `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(displayName)}`
                }
                alt={displayName}
                className="w-10 h-10 rounded-full border border-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-white/[0.02]">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${role.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${role.dot} animate-pulse`} />
              <RoleIcon className={`text-[10px] ${role.color}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${role.color}`}>
                {role.label}
              </span>
            </div>
          </div>

          {/* ── Menu Items ─────────────────────────────────────── */}
          <div className="p-2 space-y-1">
            {/* Dashboard */}
            <Link
              to={role.dashboardPath}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${role.bg}`}>
                <RoleIcon className={`text-xs ${role.color}`} />
              </div>
              <span className="text-sm font-semibold">Dashboard</span>
            </Link>

            {/* Divider */}
            <div className="mx-3 my-1 border-t border-white/[0.06]" />

            {/* Logout */}
            <button
              onClick={() => { handleLogout(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-all text-slate-400 hover:text-red-400 group"
            >
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <FaSignOutAlt className="text-xs text-red-400 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="text-sm font-semibold">Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;
