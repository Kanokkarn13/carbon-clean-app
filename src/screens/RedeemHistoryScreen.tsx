import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  fetchRedemptions,
  Redemption,
  RedemptionStatus,
} from '../services/rewardService';
import type { RootStackParamList, User } from './HomeStack';

type HistoryUser = User & { profile_picture?: string | null };

type Props = NativeStackScreenProps<RootStackParamList, 'RedeemHistory'>;

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626',
  chip: '#ECFDF5',
};

const STATUS_META: Record<
  RedemptionStatus,
  { label: string; tint: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: { label: 'Approved', tint: '#DCFCE7', color: '#15803D', icon: 'checkmark-circle' },
  pending:  { label: 'Pending',  tint: '#FEF3C7', color: '#B45309', icon: 'time' },
  rejected: { label: 'Rejected', tint: '#FEE2E2', color: '#B91C1C', icon: 'close-circle' },
  cancelled:{ label: 'Cancelled',tint: '#E5E7EB', color: '#4B5563', icon: 'remove-circle' },
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const RedeemHistoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const params = (route?.params ?? {}) as { user?: HistoryUser; totalPoints?: number };

  const user = params.user;
  const userId = useMemo(() => {
    const raw = user?.user_id ?? (user as any)?.id ?? null;
    const num = raw != null ? Number(raw) : NaN;
    return Number.isFinite(num) ? num : null;
  }, [user]);

  const avatarUri = useMemo(
    () =>
      user?.profile_picture && user.profile_picture.trim()
        ? user.profile_picture
        : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
    [user?.profile_picture]
  );
  const userName = useMemo(() => {
    const fname = user?.fname ?? '';
    const lname = user?.lname ?? '';
    const full = `${fname} ${lname}`.trim();
    return full || user?.email || 'Member';
  }, [user]);

  const totalPoints = useMemo(() => Math.max(0, Math.round(params.totalPoints ?? 0)), [params.totalPoints]);

  const pointsLabel = `${totalPoints.toLocaleString()} P`;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Redemption[]>([]);

  const totalRedeemed = useMemo(
    () => items.reduce((sum, item) => sum + (item.cost_points || 0), 0),
    [items]
  );

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchRedemptions(userId);
      setItems(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load redemption history.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const response = await fetchRedemptions(userId);
      setItems(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to refresh history.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onItemPress = useCallback(
    (item: Redemption) => {
      navigation.navigate('RedeemHistoryDetail', { redemption: item, user });
    },
    [navigation, user]
  );

  const renderItem = ({ item }: { item: Redemption }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => onItemPress(item)}>
        <View style={styles.row}>
          <View style={styles.thumbnailWrap}>
            {item.reward_image_url ? (
              <Image source={{ uri: item.reward_image_url }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                <Ionicons name="gift-outline" size={20} color={theme.primaryDark} />
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.title} numberOfLines={1}>
              {item.reward_title || `Reward #${item.reward_id ?? '-'}`}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {item.reward_description || 'No description available'}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.statusPill, { backgroundColor: meta.tint }]}>
                <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>
          </View>

          <View style={styles.pointsChip}>
            <Text style={styles.pointsValue}>{item.cost_points.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = () => (
    <>
      {/* ----- Custom Header: Back + Title ----- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redeem History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ----- โปรไฟล์หัวหน้าเพจ ----- */}
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.profileSubtitle}>Available points</Text>
        </View>
        <View style={styles.pointChipBig}>
          <Text style={styles.pointChipValue}>{pointsLabel}</Text>
        </View>
      </View>

      {/* ----- สรุปด้านบน ----- */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Redemptions</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Points Used</Text>
            <Text style={[styles.summaryValue, { color: theme.primaryDark }]}>
              {totalRedeemed.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const listEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="gift-outline" size={36} color={theme.sub} />
      <Text style={styles.emptyTitle}>No redemptions yet</Text>
      <Text style={styles.emptySubtitle}>
        Redeem rewards to build your history and track points usage.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {userId == null ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Unable to identify the current user. Please sign in again.
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primaryDark} />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[theme.primaryDark]}
              tintColor={theme.primaryDark}
            />
          }
        />
      )}

      {error ? (
        <View style={styles.errorToast}>
          <Ionicons name="warning-outline" size={16} color={theme.danger} />
          <Text style={styles.errorToastText}>{error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* ---------- Header ---------- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  headerSpacer: { width: 36 },

  /* ----- โปรไฟล์หัวหน้าเพจ ----- */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: { width: '100%', height: '100%' },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 16, fontWeight: '700', color: theme.text },
  profileSubtitle: { fontSize: 13, marginTop: 2, color: theme.sub },
  pointChipBig: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.primary,
  },
  pointChipValue: { color: '#fff', fontWeight: '700' },

  /* ----- ของเดิม ----- */
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: theme.sub },
  summaryCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryCol: { alignItems: 'center', flex: 1 },
  summaryLabel: { color: theme.sub, fontSize: 12, fontWeight: '600' },
  summaryValue: { color: theme.text, fontSize: 20, fontWeight: '800', marginTop: 6 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.border, height: 36 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumbnailWrap: { marginRight: 14 },
  thumbnail: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F3F4F6' },
  thumbnailFallback: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: theme.text },
  subtitle: { marginTop: 4, color: theme.sub, fontSize: 13 },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusLabel: { fontWeight: '700', fontSize: 12 },
  date: { color: theme.sub, fontSize: 12 },
  pointsChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 12,
    backgroundColor: theme.chip,
  },
  pointsValue: { fontSize: 15, fontWeight: '800', color: theme.primaryDark },
  pointsLabel: { color: theme.sub, fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySubtitle: { color: theme.sub, textAlign: 'center', paddingHorizontal: 40 },
  errorBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: theme.danger, fontWeight: '600', textAlign: 'center' },
  errorToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorToastText: { color: theme.danger, flex: 1 },
});

export default RedeemHistoryScreen;

