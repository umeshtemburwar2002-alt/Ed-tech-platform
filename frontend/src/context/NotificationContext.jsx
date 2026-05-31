import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch current user and initial notifications
  useEffect(() => {
    let subscription = null;
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('[NotificationProvider] Error getting user:', userError.message);
        setLoading(false);
        return;
      }
      // Initial load (most recent 50)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('[NotificationProvider] Error loading notifications:', error.message);
      } else {
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
      setLoading(false);

      // Real-time subscription for INSERTs
      subscription = supabase
        .channel(`public:notifications:user=${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    };
    init();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const markAsRead = async (id) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      console.error('[NotificationProvider] markAsRead error:', error.message);
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (error) {
      console.error('[NotificationProvider] markAllAsRead error:', error.message);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      console.error('[NotificationProvider] deleteNotification error:', error.message);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
