import { supabase } from '@/libs/supabase';
import { useEffect, useState } from 'react';

interface Coupon {
  id: string;
  code: string;
  action: string;
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchCoupons() {
    setLoading(true);
    const { data, error } = await supabase.from('coupons').select('*');

    if (error) {
      console.error('Error fetching coupons:', error);
    } else if (data) {
      setCoupons(data);
    }

    setLoading(false);
  }
  useEffect(() => {
    fetchCoupons();
  }, []);

  return { coupons, loading, refresh: fetchCoupons };
}
