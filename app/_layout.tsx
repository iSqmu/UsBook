import { supabase } from '@/libs/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: 'green' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: 'red' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

export default function RootLayout() {
  const { session, setSession, hasProfile, setHasProfile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    async function inicializarAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .maybeSingle();

        const tienePerfilValido =
          profile && profile.username && profile.username.trim() !== '';
        setHasProfile(!!tienePerfilValido);
      } else {
        setHasProfile(false);
      }
      setIsAuthLoading(false);
    }

    inicializarAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .maybeSingle();

        const tienePerfilValido =
          profile && profile.username && profile.username.trim() !== '';
        setHasProfile(!!tienePerfilValido);
      } else {
        setHasProfile(false);
      }
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!navigationState?.key || isAuthLoading) return;

    const primerSegmento = segments[0] as string | undefined;
    const inTabsGroup = primerSegmento === '(tabs)';

    if ((!session || !hasProfile) && inTabsGroup) {
      router.replace('/');
    } else if (session && hasProfile && !inTabsGroup) {
      router.replace('/(tabs)/coupons');
    }
  }, [segments, session, hasProfile, navigationState, isAuthLoading]);

  if (isAuthLoading || !navigationState?.key) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ActionSheetProvider>
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <Toast topOffset={60} config={toastConfig} />
        </>
      </ActionSheetProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
