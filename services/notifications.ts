import { supabase } from '@/libs/supabase';

const SUPABASE_URL = 'https://vseutgxrukqwnxmyjoba.supabase.co';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-notification`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId, title, message }),
    },
  );

  const result = await response.json();
  console.log('createNotification response:', JSON.stringify(result));
  if (!response.ok) throw new Error(result.error?.message);
  return result.data;
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
}

export async function markNotificationAsRead(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markNotificationAsUnread(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: false })
    .eq('id', notificationId);
  if (error) {
    throw error;
  }
}

export async function deleteNotification(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}
