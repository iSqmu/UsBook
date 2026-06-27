import { COLORES } from '@/constants/colors';
import { supabase } from '@/libs/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { session } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!session?.user.id) return;

    // Carga inicial
    fetchUnreadCount();

    // ✅ Suscripción en tiempo real — se actualiza solo cuando llega una notif nueva
    const channel = supabase
      .channel('notifications-badge')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => fetchUnreadCount(), // recalcula el badge en cada cambio
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  async function fetchUnreadCount() {
    if (!session?.user.id) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORES.principal,
        tabBarInactiveTintColor: COLORES.textoMutado,
        tabBarStyle: {
          backgroundColor: COLORES.tarjeta,
          borderTopWidth: 1,
          borderTopColor: COLORES.borde,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="coupons"
        options={{
          title: 'Mis Cupones',
          tabBarLabel: 'Cupones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificaciones',
          tabBarLabel: 'Notificaciones',
          // ✅ Badge: muestra el número si hay no leídas, oculto si no hay
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={size}
              color={unreadCount > 0 ? '#ef4444' : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
