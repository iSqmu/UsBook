import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type SupabaseStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export const supabaseUrl = 'https://vseutgxrukqwnxmyjoba.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZXV0Z3hydWtxd254bXlqb2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzMwMDcsImV4cCI6MjA5NzU0OTAwN30.vvbxJMoQlMrAGBLarkhGVqjKOzaBn-JtXwuaSKX3CeA';

const webStorage: SupabaseStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;

    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(key);
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
