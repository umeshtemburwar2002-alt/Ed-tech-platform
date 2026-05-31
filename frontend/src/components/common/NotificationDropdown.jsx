import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const NotificationDropdown = ({ isOpen, onClose, notifications = [] }) => {
  const { markAsRead, markAllAsRead } = useNotifications();
  // Simple grouping based on time string heuristics
  const groupNotifications = () => {
    const groups = { Today: [], Yesterday: [], Older: [] };
    notifications.forEach((n) => {
      const lower = (n.time || '').toLowerCase();
      if (lower.includes('hour') || lower.includes('min') || lower.includes('minutes')) {
        groups.Today.push(n);
      } else if (lower.includes('day') && (lower.includes('1 day') || lower.includes('yesterday'))) {
        groups.Yesterday.push(n);
      } else {
        groups.Older.push(n);
      }
    });
    return groups;
  };
  const groups = groupNotifications();

  const renderGroup = (title, items) =>
    items.length > 0 && (
      <div>
        <h4 className="px-4 py-2 text-sm font-bold text-slate-400 bg-black/40">{title}</h4>
        {items.map((n) => (
          <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group" onClick={() => { if (!n.is_read) markAsRead(n.id); onClose(); }}>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{n.title}</h4>
            <p className="text-xs text-slate-300 mt-1">{n.message}</p>
            <span className="text-[10px] text-slate-500 mt-2 block font-medium">{n.time}</span>
          </div>
        ))}
      </div>
    );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute top-full right-0 w-80 bg-black/[0.6] border border-white/10 rounded-2xl p-0 overflow-hidden shadow-2xl z-[110] backdrop-blur-md mt-2"
        >
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black">
            <h3 className="font-bold text-white text-sm">Notifications</h3>
            <button className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest hover:underline" onClick={markAllAsRead}>Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              <>
                {renderGroup('Today', groups.Today)}
                {renderGroup('Yesterday', groups.Yesterday)}
                {renderGroup('Older', groups.Older)}
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">No new notifications</div>
            )}
          </div>
          <Link
            to="/dashboard/notifications"
            onClick={onClose}
            className="block p-3 text-center text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/[0.02]"
          >
            View All
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
