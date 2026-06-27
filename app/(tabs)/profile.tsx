import PrimaryButton from '@/components/primaryButton';
import PrimaryInput from '@/components/primaryInput';
import { COLORES } from '@/constants/colors';
import { supabase } from '@/libs/supabase';
import * as InviteService from '@/services/invites';
import * as NotificationService from '@/services/notifications';
import * as ProfileService from '@/services/profile';
import { useCallback, useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function Profile() {
  const [username, setUsername] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [partnerCode, setPartnerCode] = useState<string>('');
  const [partner, setPartner] = useState<any>(null);
  const [hasSentInvite, setHasSentInvite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  function handleLogout() {
    supabase.auth.signOut();
  }

  function copyCodeToClipboard() {
    if (user?.code) {
      Clipboard.setStringAsync(user.code);
      Toast.show({
        type: 'success',
        text1: 'Código copiado',
        text2: 'Tu código de pareja ha sido copiado al portapapeles.',
      });
    }
  }

  function handleRemovePartner(partnerId: string, userId: string) {
    if (!partnerId || !userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo obtener tu perfil. Intenta de nuevo.',
      });
      return;
    }

    ProfileService.removePartner(partnerId, userId)
      .then(async () => {
        setRefreshing(true);
        fetchData().finally(() => setRefreshing(false));
        await Promise.all([
          NotificationService.createNotification(
            userId,
            '💔 Pareja eliminada',
            'Tu pareja ha sido eliminada. Puedes vincularte con otra persona.',
          ),
          NotificationService.createNotification(
            partnerId,
            '💔 Pareja eliminada',
            'Tu pareja ha sido eliminada. Puedes vincularte con otra persona.',
          ),
        ])
        Toast.show({ type: 'success', text1: 'Pareja eliminada' });
      })
      .catch((error) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo eliminar la pareja.',
        });
        console.error('Error removing partner:', error);
      });
  }

  async function handleInvite() {
    if (!user?.id) return;

    try {
      
      await InviteService.sendInvite(partnerCode, user.id);
      
      await NotificationService.createNotification(
        user.id,
        '💌 Invitación enviada',
        'Tu invitación fue enviada. Espera a que tu pareja la acepte.',
      );
      
      Toast.show({ type: 'success', text1: 'Invitación enviada' });
      setHasSentInvite(true);
    } catch (error) {
      console.log('ERROR handleInvite:', JSON.stringify(error));
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2:
          'No se pudo enviar la invitación, revisa que el código sea correcto.',
      });
    }
  }

  const fetchData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    setUsername(profile?.username || 'Usuario');
    setUser(profile || null);

    // Si ya tiene pareja, no necesitamos chequear invites
    if (profile?.partner_code) {
      setPartnerCode(profile.partner_code);
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('code', profile.partner_code)
        .maybeSingle();
      setPartner(partnerData || null);
      setHasSentInvite(false);
      return;
    }

    // Sin pareja: chequeamos si tiene invite pendiente
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('from', session.user.id)
      .limit(1)
      .maybeSingle();

    setHasSentInvite(!!invite);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORES.principal}
            colors={[COLORES.principal]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORES.principal} />
          </View>
        ) : (
          <View style={styles.container}>
            {/* Header de perfil */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.subtitulo}>Tu perfil</Text>
              <Text style={styles.titulo}>@{username}</Text>

              <View style={styles.codeBadge}>
                <Text style={styles.codeLabel}>Tu código</Text>
                <Text onPress={copyCodeToClipboard} style={styles.codeValue}>{user?.code}</Text>
              </View>
            </View>

            {/* Sección de pareja */}
            <View style={styles.section}>
              {user?.partner_code ? (
                <View style={styles.partnerCard}>
                  <Text style={styles.partnerEmoji}>💑</Text>
                  <Text style={styles.partnerLabel}>Conectado con</Text>
                  <Text style={styles.partnerName}>
                    @{partner?.username || 'Usuario'}
                  </Text>
                  <Text>{partner?.id}</Text>

                  <TouchableOpacity
                    onPress={() => handleRemovePartner(partner?.id, user?.id)}
                  >
                    <Text style={styles.removePartnerText}>
                      Eliminar pareja
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : hasSentInvite ? (
                <View style={styles.pendingCard}>
                  <Text style={styles.pendingEmoji}>⏳</Text>
                  <Text style={styles.pendingTitle}>Invitación enviada</Text>
                  <Text style={styles.pendingSubtitle}>
                    Esperando que tu pareja acepte...
                  </Text>
                </View>
              ) : (
                <View style={styles.inviteCard}>
                  <Text style={styles.inviteTitle}>Sin pareja vinculada</Text>
                  <Text style={styles.inviteSubtitle}>
                    Ingresa el código de tu pareja para conectarse
                  </Text>
                  <PrimaryInput
                    placeholder="Código de tu pareja"
                    value={partnerCode}
                    onChangeText={(text) => setPartnerCode(text)}
                  />
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton
                      title="Enviar invitación"
                      onPress={handleInvite}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Cerrar sesión */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    marginTop: 100,
  },
  container: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORES.principal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitulo: {
    fontSize: 13,
    color: '#9ba3af',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  codeBadge: {
    marginTop: 10,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.principal,
    letterSpacing: 3,
    marginTop: 2,
  },
  section: {
    gap: 12,
  },
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  partnerEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  partnerLabel: {
    fontSize: 13,
    color: '#9ba3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partnerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  pendingSubtitle: {
    fontSize: 13,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 2,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  inviteSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  removePartnerText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
