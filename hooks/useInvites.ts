import { supabase } from '@/libs/supabase';
import { useCallback, useEffect, useState } from 'react';

export function useInvites(userId: string | null) {
  const [invites, setInvites] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('to', userId);
    if (error) {
      console.error('Error fetching invites:', error);
      return;
    }
    setInvites(data || []);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadInvites();
    setRefreshing(false);
  }, [loadInvites, userId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  return { invites, setInvites, refreshing, refresh };
}