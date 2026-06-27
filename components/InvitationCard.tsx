import { COLORES } from '@/constants/colors';
import { supabase } from '@/libs/supabase';
import { acceptInvite, declineInvite } from '@/services/invites';
import { createNotification } from '@/services/notifications';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Swipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Toast from 'react-native-toast-message';

interface Invite {
  id: string;
  from: string;
  created_at: string;
  to: string;
}

interface InvitationCardProps {
  invite: Invite;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export default function InvitationCard({
  invite: invitation,
  onAccept,
  onDecline,
}: InvitationCardProps) {
  const [username, setUsername] = useState<string>('');
  const [fromUsername, setFromUsername] = useState<string>('');
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

  useEffect(() => {
    async function fetchUsernames() {
      const { data: fromData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', invitation.from)
        .single();

      const { data: toData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', invitation.to)
        .single();

      setFromUsername(fromData?.username || 'Usuario desconocido');
      setUsername(toData?.username || 'Usuario desconocido'); // quien recibe = "username"
    }
    fetchUsernames();
  }, []);

  async function handleAccept() {
    try {
      cardRef.current?.close();
      await acceptInvite(invitation.id);
      await Promise.all([
        createNotification(
          invitation.from,
          'Invitación aceptada',
          `${username} ha aceptado tu invitación.`,
        ),
        createNotification(
          invitation.to,
          'Invitación aceptada',
          `Has aceptado la invitación de ${fromUsername}.`,
        ),
      ]);
      onAccept(invitation.id);
      Toast.show({ type: 'success', text1: 'Invitación aceptada' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo aceptar la invitación.',
      });
    }
  }

  async function handleDecline() {
    try {
      cardRef.current?.close();
      await declineInvite(invitation.id);
      await Promise.all([
        createNotification(
          invitation.from,
          'Invitación declinada',
          `${username} ha declinado tu invitación.`,
        ),
        createNotification(
          invitation.to,
          'Invitación declinada',
          `Has declinado la invitación de ${fromUsername}.`,
        ),
      ]);

      onDecline(invitation.id);
      Toast.show({ type: 'success', text1: 'Invitación declinada' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo declinar la invitación.',
      });
      cardRef.current?.close();
    }
  }

  function RightAction() {
    return (
      <View style={[styles.swipeAction, { backgroundColor: '#10b981' }]}>
        <Text style={styles.swipeEmoji}>✓</Text>
        <Text style={styles.swipeLabel}>Aceptar</Text>
      </View>
    );
  }

  function LeftAction() {
    return (
      <View style={[styles.swipeAction, { backgroundColor: '#ef4444' }]}>
        <Text style={styles.swipeEmoji}>✕</Text>
        <Text style={styles.swipeLabel}>Declinar</Text>
      </View>
    );
  }

  return (
    <Swipeable
      renderRightActions={RightAction}
      renderLeftActions={LeftAction}
      ref={cardRef}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'right') handleDecline();
        else if (direction === 'left') handleAccept();
      }}
    >
      <View style={styles.card}>
        {/* Franja de acento izquierda */}
        <View style={styles.accentBar} />

        <View style={styles.content}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>💌 {username}</Text>
            <Text style={styles.message}>
              Te ha enviado una invitación para ser su pareja
            </Text>
            <Text style={styles.date}>{formatDate(invitation.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.hint}>← Aceptar · Declinar →</Text>
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
  },
  accentBar: {
    height: 4,
    backgroundColor: COLORES.principal,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.principal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1f2937',
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

  // Acciones de swipe
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
