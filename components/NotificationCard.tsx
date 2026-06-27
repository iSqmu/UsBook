import { COLORES } from '@/constants/colors';
import * as NotificationService from '@/services/notifications';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Swipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Toast from 'react-native-toast-message';

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationCardProps {
  notification: Notification;
  onRead: (id: number) => void;
  onUnread: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function NotificationCard({
  notification,
  onRead,
  onUnread,
  onDelete,
}: NotificationCardProps) {
  const cardRef = useRef<SwipeableMethods>(null);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const handleRead = async () => {
    try {
      await NotificationService.markNotificationAsRead(
        notification.id,
      );
      onRead(notification.id);
      cardRef.current?.close();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo marcar como leída.',
      });
    }
  };

  const handleUnread = async () => {
    try {
      await NotificationService.markNotificationAsUnread(notification.id);
      onUnread(notification.id);
      cardRef.current?.close();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo marcar como no leída.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await NotificationService.deleteNotification(notification.id);
      onDelete(notification.id);
      cardRef.current?.close();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo eliminar la notificación.',
      });
    }
  };

  function RightAction() {
    return notification.is_read ? (
      <View style={[styles.swipeAction, { backgroundColor: '#f59e0b' }]}>
        <Text style={styles.swipeEmoji}>↩</Text>
        <Text style={styles.swipeLabel}>No leída</Text>
      </View>
    ) : (
      <View style={[styles.swipeAction, { backgroundColor: '#10b981' }]}>
        <Text style={styles.swipeEmoji}>✓</Text>
        <Text style={styles.swipeLabel}>Leída</Text>
      </View>
    );
  }

  function LeftAction() {
    return (
      <View style={[styles.swipeAction, { backgroundColor: '#ef4444' }]}>
        <Text style={styles.swipeEmoji}>🗑️</Text>
        <Text style={styles.swipeLabel}>Eliminar</Text>
      </View>
    );
  }

  return (
    <Swipeable
      renderRightActions={RightAction}
      renderLeftActions={LeftAction}
      ref={cardRef}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'left') {
          notification.is_read ? handleUnread() : handleRead();
        } else if (direction === 'right') {
          handleDelete();
        }
      }}
    >
      <View style={[styles.card, notification.is_read && styles.cardRead]}>
        {!notification.is_read && <View style={styles.unreadDot} />}

        <View style={styles.content}>
          <View style={styles.textContent}>
            <Text
              style={[styles.title, notification.is_read && styles.titleRead]}
            >
              {notification.title}
            </Text>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.date}>
              {formatDate(notification.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          ← Eliminar · {notification.is_read ? 'No leída' : 'Leída'} →
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORES.principal,
  },
  cardRead: {
    borderLeftColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORES.principal,
  },
  content: {
    padding: 14,
  },
  textContent: {
    gap: 4,
    paddingRight: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1f2937',
  },
  titleRead: {
    color: '#6b7280',
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: '#9ba3af',
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    color: '#9ba3af',
    textAlign: 'center',
    paddingBottom: 10,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    gap: 4,
  },
  swipeEmoji: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  swipeLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
});
