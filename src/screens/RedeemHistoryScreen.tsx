import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { fetchRedemptions, Redemption } from '../services/rewardService';
import type { RootStackParamList } from './HomeStack';

type Props = NativeStackScreenProps<RootStackParamList, 'RedeemHistory'>;

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
  danger: '#DC2626',
};

const statusPalette: Record<string, { bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }> =
  {
    approved: { bg: '#DCFCE7', color: '#15803D', icon: 'checkmark-circle' },
    pending: { bg: '#FEF3C7', color: '#B45309', icon: 'time' },
    rejected: { bg: '#FEE2E2', color: '#B91C1C', icon: 'close-circle' },
    cancelled: { bg: '#E5E7EB', color: '#4B5563', icon: 'remove-circle' },
  };

function formatDate(value?: string) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch {
    return value;
  }
}

const RedeemHistoryScreen: React.FC<Props> = ({ route }) => {
  const user = route.params?.user;
  const userId = useMemo(() => {
    const raw = user?.user_id ?? (user as any)?.id ?? null;
    const num = raw != null ? Number(raw) : NaN;
    return Number.isFinite(num) ? num : null;
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Redemption[]>([]);

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await fetchRedemptions(userId);
      setItems(results);
    } catch (err: unknown) {
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
      const results = await fetchRedemptions(userId);
      setItems(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load redemption history.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const renderItem = ({ item }: { item: Redemption }) => {
    const palette = statusPalette[item.status] ?? statusPalette.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.reward_title || `Reward #${item.reward_id ?? '-'}`}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.reward_description || 'No description'}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: palette.bg }]}>
            <Ionicons
              name={palette.icon}
              size={14}
              color={palette.color}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusText, { color: palette.color }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Points</Text>
            <Text style={styles.footerValue}>{item.cost_points.toLocaleString()} P</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Redeemed at</Text>
            <Text style={styles.footerValue}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const listEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="gift-outline" size={36} color={theme.sub} />
      <Text style={styles.emptyTitle}>No redemption yet</Text>
      <Text style={styles.emptySubtitle}>
        Redeem rewards to see your history here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Redeem History</Text>
        <Text style={styles.headerSubtitle}>
          Track all rewards you have redeemed so far.
        </Text>
      </View>

      {userId == null ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Unable to identify current user. Please sign in again.
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primaryDark} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
  headerSubtitle: { marginTop: 4, color: theme.sub },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: theme.sub },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  cardSubtitle: { marginTop: 4, color: theme.sub, fontSize: 13 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { fontWeight: '700', fontSize: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerCol: { flex: 1 },
  footerLabel: { fontSize: 12, color: theme.sub, fontWeight: '600' },
  footerValue: { fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 4 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySubtitle: { color: theme.sub, textAlign: 'center', paddingHorizontal: 16 },
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
