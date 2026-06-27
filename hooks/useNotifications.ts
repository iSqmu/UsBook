import { supabase } from '@/libs/supabase';
import { getNotifications } from '@/services/notifications';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useCallback, useEffect, useState } from 'react';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const data = await getNotifications(userId);

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;

    try {
      setRefreshing(true);

      const data = await getNotifications(userId);

      setNotifications(data || []);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }

    const { setUnreadCount } = useNotificationStore.getState();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (count !== null) {
      setUnreadCount(count);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    refreshing,
    refresh,
  };
}
