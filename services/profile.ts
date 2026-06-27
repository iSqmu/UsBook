import { supabase, supabaseUrl } from '@/libs/supabase';

export async function removePartner(partnerId: string, userId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Borrar cupones entre estos dos usuarios
  await supabase
    .from('coupons')
    .delete()
    .or(`created_by.eq.${userId},created_by.eq.${partnerId}`)
    .or(`target_user_id.eq.${userId},target_user_id.eq.${partnerId}`);

  const response = await fetch(`${supabaseUrl}/functions/v1/remove-partner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ userId, partnerId }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message);
  return result;
}
