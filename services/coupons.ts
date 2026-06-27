import { supabase } from '@/libs/supabase';

export async function getCoupons(userId: string, partnerId: string) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .or(`created_by.eq.${userId},target_user_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
  return data || [];
}

export async function createCoupon(
  action: string,
  createdBy: string,
  targetUserId: string,
  expiresAt: string | null,
) {
  // Generamos un código aleatorio
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code,
      action,
      created_by: createdBy,
      target_user_id: targetUserId,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function updateCoupon(
  id: string,
  code: string,
  action: string,
  expiresAt: string | null,
) {
  const { data, error } = await supabase
    .from('coupons')
    .update({ code, action, expires_at: expiresAt })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function redeemCoupon(code: string, userId: string) {
  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('target_user_id', userId) // solo puede redimir la pareja
    .maybeSingle();

  if (couponError) throw couponError;
  if (!coupon) throw new Error('Cupón no encontrado o no es para ti');

  const { data: existing } = await supabase
    .from('redeemed_coupons')
    .select('*')
    .eq('coupon_id', coupon.id)
    .maybeSingle();

  if (existing) throw new Error('Este cupón ya fue redimido');

  const { error: redeemError } = await supabase
    .from('redeemed_coupons')
    .insert({ coupon_id: coupon.id, user_id: userId });

  if (redeemError) throw redeemError;
  return coupon;
}
