import PrimaryButton from '@/components/primaryButton';
import PrimaryInput from '@/components/primaryInput';
import { COLORES } from '@/constants/colors';
import { supabase } from '@/libs/supabase';
import { createCoupon, deleteCoupon, getCoupons, redeemCoupon, updateCoupon } from '@/services/coupons';
import { createNotification } from '@/services/notifications';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// ActionSheet solo en nativo
const ActionSheetProvider =
  Platform.OS !== 'web'
    ? require('@expo/react-native-action-sheet').ActionSheetProvider
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

const useActionSheet =
  Platform.OS !== 'web'
    ? require('@expo/react-native-action-sheet').useActionSheet
    : () => ({ showActionSheetWithOptions: null });

// DateTimePicker solo en nativo
const DateTimePicker =
  Platform.OS !== 'web'
    ? require('@react-native-community/datetimepicker').default
    : null;

export default function Coupons() {
  const actionSheet = useActionSheet();
  const showActionSheetWithOptions = actionSheet?.showActionSheetWithOptions ?? null;

  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerUsername, setPartnerUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [redeemedCoupons, setRedeemedCoupons] = useState<any[]>([]);
  const [code, setCode] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [newAction, setNewAction] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modal de opciones para web (reemplaza ActionSheet)
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedCouponForOptions, setSelectedCouponForOptions] = useState<any>(null);

  async function loadData(uid: string) {
    try {
      const couponsData = await getCoupons(uid, partnerId || '');
      setCoupons(couponsData || []);

      const { data: redeemedData, error } = await supabase
        .from('redeemed_coupons')
        .select('*')
        .eq('user_id', uid);
      if (error) throw error;
      setRedeemedCoupons(redeemedData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  useEffect(() => {
    async function fetchUserProfile() {
      try {
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
        setUserId(session.user.id);

        if (profile?.partner_code) {
          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('code', profile.partner_code)
            .maybeSingle();

          if (partnerProfile) {
            setPartnerId(partnerProfile.id);
            setPartnerUsername(partnerProfile.username || 'tu pareja');
          }
        }

        await loadData(session.user.id);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          const updatedProfile = payload.new;
          if (updatedProfile.partner_code) {
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('code', updatedProfile.partner_code)
              .maybeSingle();

            if (partnerProfile) {
              setPartnerId(partnerProfile.id);
              setPartnerUsername(partnerProfile.username || 'tu pareja');
              await loadData(userId);
            }
          } else {
            setPartnerId(null);
            setPartnerUsername('');
            setCoupons([]);
            setRedeemedCoupons([]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleLongPressCoupon(item: any) {
    if (Platform.OS === 'web') {
      // En web mostramos un modal simple en lugar del ActionSheet nativo
      setSelectedCouponForOptions(item);
      setOptionsModalVisible(true);
      return;
    }

    const options = ['✏️ Editar', '🗑️ Eliminar', 'Cancelar'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
        title: item.action,
        message: `Código: ${item.code}`,
      },
      (selectedIndex: number) => {
        if (selectedIndex === 0) openEditModal(item);
        if (selectedIndex === 1) handleDeleteCoupon(item);
      },
    );
  }

  function openEditModal(item: any) {
    setEditingCoupon(item);
    setNewAction(item.action);
    setExpiresAt(item.expires_at ? new Date(item.expires_at) : null);
    setModalVisible(true);
  }

  function openCreateModal() {
    setEditingCoupon(null);
    setNewAction('');
    setExpiresAt(null);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingCoupon(null);
    setNewAction('');
    setExpiresAt(null);
    setShowDatePicker(false);
  }

  async function handleDeleteCoupon(item: any) {
    try {
      await deleteCoupon(item.id);
      setCoupons((prev) => prev.filter((c) => c.id !== item.id));
      Toast.show({ type: 'success', text1: 'Cupón eliminado' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el cupón.' });
    }
  }

  async function handleSaveCoupon() {
    if (!newAction.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Describe qué hace el cupón.', position: 'bottom' });
      return;
    }

    if (!editingCoupon && !partnerId) {
      Toast.show({ type: 'error', text1: 'Sin pareja vinculada', text2: 'Necesitas vincular una pareja primero.', position: 'top' });
      return;
    }

    try {
      setCreating(true);

      if (editingCoupon) {
        const updated = await updateCoupon(
          editingCoupon.id,
          editingCoupon.code,
          newAction.trim(),
          expiresAt ? expiresAt.toISOString() : null,
        );
        setCoupons((prev) =>
          prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...updated } : c)),
        );
        Toast.show({ type: 'success', text1: '✏️ Cupón actualizado' });
      } else {
        const coupon = await createCoupon(
          newAction.trim(),
          userId!,
          partnerId!,
          expiresAt ? expiresAt.toISOString() : null,
        );
        setCoupons((prev) => [...prev, coupon]);

        Promise.all([
          createNotification(userId!, '🎁 Cupón creado', `Creaste un cupón para @${partnerUsername}: "${newAction.trim()}"`),
          createNotification(partnerId!, '🎁 Nuevo cupón', `@${username} te envió un cupón: "${newAction.trim()}"`),
        ]).catch(console.error);

        Toast.show({ type: 'success', text1: '¡Cupón creado!', text2: 'Tu pareja ya puede canjearlo.', position: 'bottom' });
      }

      closeModal();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Inténtalo de nuevo.', position: 'bottom' });
    } finally {
      setCreating(false);
    }
  }

  async function handleRedeemCode() {
    if (!code.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Por favor ingresa un código.', position: 'bottom' });
      return;
    }

    try {
      const redeemedCoupon = await redeemCoupon(code.trim(), userId || '');
      setRedeemedCoupons((prev) => [...prev, { coupon_id: redeemedCoupon.id, user_id: userId }]);
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== redeemedCoupon.id));
      setCode('');

      Promise.all([
        createNotification(userId || '', '🎟️ Cupón canjeado', `Canjeaste el cupón: "${redeemedCoupon.action}"`),
        redeemedCoupon.created_by
          ? createNotification(redeemedCoupon.created_by, '🎟️ Cupón redimido', `@${username} canjeó tu cupón: "${redeemedCoupon.action}"`)
          : Promise.resolve(),
      ]).catch(console.error);

      Toast.show({ type: 'success', text1: '¡Cupón canjeado!', text2: 'El código fue aplicado correctamente.', position: 'bottom' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'No se pudo canjear el código.', text2: error.message || 'Intenta nuevamente más tarde.', position: 'bottom' });
    }
  }

  async function copyToClipboard(text: string) {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: '¡Copiado!', text2: `Código "${text}" en el portapapeles.`, position: 'bottom' });
  }

  async function onRefresh() {
    if (!userId) return;
    setRefreshing(true);
    await loadData(userId);
    setRefreshing(false);
  }

  function formatExpiry(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  const sentCoupons = coupons.filter((c) => c.created_by === userId);
  const receivedCoupons = coupons.filter(
    (c) =>
      c.target_user_id === userId &&
      !redeemedCoupons.some((r) => r.coupon_id === c.id),
  );

  function CouponCard({ item, isSent }: { item: any; isSent: boolean }) {
    const expired = item.expires_at && isExpired(item.expires_at);

    return (
      <TouchableOpacity
        onPress={() => copyToClipboard(item.code)}
        onLongPress={() => isSent && handleLongPressCoupon(item)}
        activeOpacity={0.8}
        style={[styles.couponCard, expired && styles.couponCardExpired]}
      >
        <View style={[styles.codeBox, isSent ? styles.codeBoxSent : {}, expired && styles.codeBoxExpired]}>
          <Text style={styles.codeText}>{item.code}</Text>
          <Text style={styles.copyHint}>Toca para copiar</Text>
        </View>
        <View style={styles.actionBox}>
          <Text style={styles.actionText}>{item.action}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.expires_at && (
              <Text style={[styles.expiryText, expired && styles.expiryExpired]}>
                {expired ? '⛔ Vencido' : `⏰ Vence ${formatExpiry(item.expires_at)}`}
              </Text>
            )}
            {isSent ? (
              <Text style={styles.idText}>Para @{partnerUsername} · mantén presionado</Text>
            ) : (
              <Text style={styles.idText}>De @{partnerUsername}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Selector de fecha: nativo en iOS/Android, input HTML en web
  function DatePickerField() {
    if (Platform.OS === 'web') {
      return (
        <input
          type="date"
          min={new Date().toISOString().split('T')[0]}
          value={expiresAt ? expiresAt.toISOString().split('T')[0] : ''}
          onChange={(e) => {
            if (e.target.value) {
              setExpiresAt(new Date(e.target.value + 'T12:00:00'));
            } else {
              setExpiresAt(null);
            }
          }}
          style={{
            backgroundColor: '#F7F8FA',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            color: '#374151',
            border: '1px solid #e5e7eb',
            width: '100%',
            marginTop: 6,
            cursor: 'pointer',
          }}
        />
      );
    }

    return (
      <>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {expiresAt
              ? `⏰ Vence el ${expiresAt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : '📅 Sin fecha límite'}
          </Text>
          {expiresAt && (
            <TouchableOpacity
              onPress={() => setExpiresAt(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearDate}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {showDatePicker && DateTimePicker && (
          <DateTimePicker
            value={expiresAt || new Date()}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_: any, selectedDate?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setExpiresAt(selectedDate);
            }}
          />
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola,</Text>
        <Text style={styles.username}>@{username} 👋</Text>
        <Text style={styles.subtitle}>
          Crea cupones para tu pareja o canjea los que recibiste
        </Text>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => ''}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORES.principal} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ gap: 14 }}>
              {/* Cupones recibidos */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📥 Para ti</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{receivedCoupons.length}</Text>
                  </View>
                </View>

                {receivedCoupons.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎁</Text>
                    <Text style={styles.emptyTitle}>Sin cupones recibidos</Text>
                    <Text style={styles.emptySubtitle}>Tu pareja aún no te ha enviado ninguno</Text>
                  </View>
                ) : (
                  receivedCoupons.map((item) => (
                    <CouponCard key={item.id} item={item} isSent={false} />
                  ))
                )}
              </View>

              {/* Cupones enviados */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📤 Enviados</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{sentCoupons.length}</Text>
                  </View>
                </View>

                {sentCoupons.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎟️</Text>
                    <Text style={styles.emptyTitle}>Sin cupones creados</Text>
                    <Text style={styles.emptySubtitle}>Crea uno para tu pareja con el botón +</Text>
                  </View>
                ) : (
                  sentCoupons.map((item) => (
                    <CouponCard key={item.id} item={item} isSent={true} />
                  ))
                )}
              </View>

              {/* Canjear código */}
              <View style={styles.redeemCard}>
                <Text style={styles.sectionTitle}>Canjear código</Text>
                <Text style={styles.sectionSubtitle}>Ingresa el código que recibiste</Text>
                <PrimaryInput
                  placeholder="Ej. ABC123"
                  onChangeText={(text) => setCode(text)}
                  value={code}
                  keyboardType="default"
                />
                <View style={{ marginTop: 10 }}>
                  <PrimaryButton title="Canjear" onPress={handleRedeemCode} />
                </View>
              </View>
            </View>
          )
        }
      />

      {/* FAB */}
      {!loading && (
        <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Modal opciones (reemplaza ActionSheet en web) */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={[styles.modalCard, { paddingBottom: 24 }]}>
            <Text style={styles.modalTitle}>{selectedCouponForOptions?.action}</Text>
            <Text style={styles.modalSubtitle}>Código: {selectedCouponForOptions?.code}</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setOptionsModalVisible(false);
                openEditModal(selectedCouponForOptions);
              }}
            >
              <Text style={styles.optionText}>✏️ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.optionDestructive]}
              onPress={() => {
                setOptionsModalVisible(false);
                handleDeleteCoupon(selectedCouponForOptions);
              }}
            >
              <Text style={[styles.optionText, { color: '#ef4444' }]}>🗑️ Eliminar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setOptionsModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal crear/editar */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
            <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>
                {editingCoupon ? '✏️ Editar cupón' : '🎁 Crear cupón'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingCoupon
                  ? `Editando código ${editingCoupon.code}`
                  : partnerId
                  ? `Solo lo podrá canjear @${partnerUsername}`
                  : 'Necesitas vincular una pareja primero'}
              </Text>

              <Text style={styles.inputLabel}>¿Qué incluye el cupón?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ej. Una cena romántica, un masaje..."
                placeholderTextColor="#9ba3af"
                value={newAction}
                onChangeText={setNewAction}
                multiline
                numberOfLines={3}
                maxLength={120}
              />
              <Text style={styles.charCount}>{newAction.length}/120</Text>

              <Text style={styles.inputLabel}>Fecha límite (opcional)</Text>
              <DatePickerField />

              <View style={{ marginTop: 16, gap: 10 }}>
                {creating ? (
                  <ActivityIndicator color={COLORES.principal} />
                ) : (
                  <>
                    <PrimaryButton
                      title={editingCoupon ? 'Guardar cambios' : 'Crear cupón'}
                      onPress={handleSaveCoupon}
                    />
                    <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 20,
    paddingBottom: 10,
  },
  header: {
    marginBottom: 16,
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9ba3af',
    textAlign: 'center',
  },
  couponCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  couponCardExpired: {
    opacity: 0.5,
  },
  codeBox: {
    backgroundColor: COLORES.principal,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '35%',
  },
  codeBoxSent: {
    backgroundColor: '#6b7280',
  },
  codeBoxExpired: {
    backgroundColor: '#d1d5db',
  },
  codeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  copyHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    marginTop: 3,
  },
  actionBox: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  idText: {
    fontSize: 11,
    color: '#9ba3af',
  },
  expiryText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  expiryExpired: {
    color: '#ef4444',
  },
  redeemCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
    marginBottom: 80,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9ba3af',
    marginBottom: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORES.principal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORES.principal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 6,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  textArea: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#9ba3af',
    textAlign: 'right',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  clearDate: {
    fontSize: 14,
    color: '#9ba3af',
    fontWeight: 'bold',
  },
  optionButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  optionDestructive: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
