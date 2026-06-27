import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  hasProfile: boolean;
  setSession: (session: Session | null) => void;
  setHasProfile: (hasProfile: boolean) => void; 
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hasProfile: false,
  setSession: (session) => set({ session }),
  setHasProfile: (hasProfile) => set({ hasProfile }),
}));