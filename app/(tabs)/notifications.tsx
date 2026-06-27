import InvitationCard from '@/components/InvitationCard';
import NotificationCard from '@/components/NotificationCard';
import { COLORES } from '@/constants/colors';
import { useInvites } from '@/hooks/useInvites';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/libs/supabase';
import * as InviteService from '@/services/invites';
import * as NotificationService from '@/services/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const [username, setUsername] = useState<string>('');

  const userId = session?.user.id || null;

  const { notifications, loading, refreshing, refresh } =
    useNotifications(userId);

  const { invites, setInvites, refresh: refreshInvites } = useInvites(userId);

  // Refresh combinado: actualiza notificaciones e invites en paralelo
  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshInvites()]);
  }, [refresh, refreshInvites]);

  useEffect(() => {
    async function fetchUsername() {
      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching username:', error);
        return;
      }
      setUsername(data?.username || 'Usuario');
    }

    fetchUsername();
  }, [userId]);

  async function handleReadNotification(notificationId: number) {
    try {
      await NotificationService.markNotificationAsRead(notificationId);
      Toast.show({ type: 'success', text1: 'Notificación leída' });
      await refresh();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar la notificación',
      });
    }
  }

  async function handleUnreadNotification(notificationId: number) {
    try {
      await NotificationService.markNotificationAsUnread(notificationId);
      Toast.show({ type: 'success', text1: 'Marcada como no leída' });
      await refresh();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar la notificación',
      });
    }
  }

  async function handleDeleteNotification(notificationId: number) {
    try {
      await NotificationService.deleteNotification(notificationId);
      Toast.show({ type: 'success', text1: 'Notificación eliminada' });
      await refresh();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo eliminar la notificación',
      });
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    try {
      const result = await InviteService.acceptInvite(inviteId);
      if (result?.error) throw result.error;
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      Toast.show({ type: 'success', text1: 'Invitación aceptada' });
      await refresh();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo aceptar la invitación.',
      });
    }
  }

  async function handleDeclineInvite(inviteId: string) {
    try {
      const { error } = await InviteService.declineInvite(inviteId);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      Toast.show({ type: 'success', text1: 'Invitación declinada' });
      await refresh();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo declinar la invitación.',
      });
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORES.principal} />
      </View>
    );
  }

  const sections = [
    {
      key: 'invites',
      title: 'Invitaciones',
      emoji: '💌',
      data: invites,
      empty: 'No tienes invitaciones pendientes',
    },
    {
      key: 'notifications',
      title: 'Notificaciones',
      emoji: '🔔',
      data: notifications,
      empty: 'No tienes notificaciones',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.username}>@{username} 👋</Text>
            <Text style={styles.subtitle}>
              Aquí puedes ver tus invitaciones y notificaciones
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{section.empty}</Text>
            </View>
          ) : null
        }
        renderItem={({ item, section }) => {
          if (section.key === 'invites') {
            return (
              <InvitationCard
                invite={item}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
              />
            );
          }
          return (
            <NotificationCard
              notification={item}
              onRead={handleReadNotification}
              onUnread={handleUnreadNotification}
              onDelete={handleDeleteNotification}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#9ba3af',
  },
  username: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F8FA',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORES.principal,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ba3af',
  },
  separator: {
    height: 10,
  },
});
