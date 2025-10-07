// src/screens/Calculation.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626', // red for emission total
};

// ---- API origin (DON'T put /api in ENV) ----
const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.104:3000';
const api = (path: string) => `${API_ORIGIN}/api${path}`;

type User = {
  user_id?: string | number;
  id?: string | number;
  fname?: string;
  lname?: string;
  email?: string;
  House_member?: number | string;
  house_member?: number | string;
};

// ---- Emission rows (from /api/saved/:user_id) ----
type SavedRow = {
  id: number;
  user_id: number;
  point_value: string;
  distance_km: string | number;
  activity: 'Car' | 'Motorcycle' | 'Taxi' | 'Bus';
  param_type: string | null;
  create_at?: string;
};

// ---- Reduction rows (from /api/reduction/saved/:user_id) ----
type ReductionRow = {
  id: number;
  user_id: number;
  point_value: string;          // saved reduction (string)
  distance_km: string | number; // DECIMAL
  activity_from: string;
  param_from: string | null;
  activity_to: string;
  param_to: string | null;
  create_at?: string;
};

function parsePositiveInt(v: unknown): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return undefined;
}
function getMembersFrom(obj: any): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = ['house_member', 'House_member', 'houseMember', 'members', 'member_count'];
  for (const k of keys) {
    const p = parsePositiveInt(obj?.[k]);
    if (p !== undefined) return p;
  }
  return undefined;
}

function EmissionCard({ item }: { item: SavedRow }) {
  const dateStr = item.create_at ? new Date(item.create_at).toISOString().slice(0, 10) : '';
  return (
    <View style={styles.savedCard}>
      <Text style={styles.savedCardTitle}>
        {item.activity}{item.param_type ? ` · ${item.param_type}` : ''}
      </Text>
      <Text style={styles.savedCardLine}>
        Distance: <Text style={styles.savedCardStrong}>{Number(item.distance_km).toFixed(2)} km</Text>
      </Text>
      <Text style={styles.savedCardLine}>
        Emission: <Text style={[styles.savedCardStrong, styles.emissionRed]}>{Number(item.point_value).toFixed(2)} kgCO₂e</Text>
      </Text>
      {!!dateStr && <Text style={styles.savedCardDate}>{dateStr}</Text>}
    </View>
  );
}

function ReductionCard({ item }: { item: ReductionRow }) {
  const dateStr = item.create_at ? new Date(item.create_at).toISOString().slice(0, 10) : '';
  return (
    <View style={styles.savedCard}>
      <Text style={styles.savedCardTitle}>
        {item.activity_from} → {item.activity_to}
      </Text>
      {(item.param_from || item.param_to) ? (
        <Text style={styles.savedCardLine}>
          {item.param_from ?? '—'} → {item.param_to ?? '—'}
        </Text>
      ) : null}
      {Number(item.distance_km) > 0 && (
        <Text style={styles.savedCardLine}>
          Distance: <Text style={styles.savedCardStrong}>{Number(item.distance_km).toFixed(2)} km</Text>
        </Text>
      )}
      <Text style={styles.savedCardLine}>
        Saved: <Text style={styles.savedCardStrong}>{Number(item.point_value).toFixed(2)} kgCO₂e</Text>
      </Text>
      {!!dateStr && <Text style={styles.savedCardDate}>{dateStr}</Text>}
    </View>
  );
}

const Calculation = ({ navigation }: any) => {
  const route = useRoute<any>();
  const params = route?.params || {};
  const user: User = params?.user || {};

  const userId = useMemo(() => Number(user?.user_id ?? user?.id), [user]);
  const members = getMembersFrom(user) ?? getMembersFrom(params) ?? 1;
  const peopleLabel = `${members} person${members === 1 ? '' : 's'}`;

  // -------- Emission state --------
  const [openSaved, setOpenSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEmission, setTotalEmission] = useState<number>(0);

  // -------- Reduction state --------
  const [openReduce, setOpenReduce] = useState(false);
  const [loadingReduce, setLoadingReduce] = useState(false);
  const [reduceError, setReduceError] = useState<string | null>(null);
  const [reduceItems, setReduceItems] = useState<ReductionRow[]>([]);
  const [refreshingReduce, setRefreshingReduce] = useState(false);
  const [totalReduction, setTotalReduction] = useState<number>(0);

  // ----- fetch Emission -----
  const fetchSaved = useCallback(async () => {
    if (!userId || userId <= 0) {
      setSavingError('Login required to load saved emissions.');
      setItems([]);
      setTotalEmission(0);
      return;
    }
    setSavingError(null);
    setLoading(true);
    try {
      const res = await fetch(api(`/saved/${userId}`));
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const list: SavedRow[] = Array.isArray(json?.items) ? json.items : [];
      setItems(list);
      const total = list.reduce((sum, it) => sum + Number(it.point_value || 0), 0);
      setTotalEmission(total);
    } catch (e: any) {
      setSavingError(e?.message || 'Failed to load');
      setItems([]);
      setTotalEmission(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ----- fetch Reduction -----
  const fetchReductions = useCallback(async () => {
    if (!userId || userId <= 0) {
      setReduceError('Login required to load saved reductions.');
      setReduceItems([]);
      setTotalReduction(0);
      return;
    }
    setReduceError(null);
    setLoadingReduce(true);
    try {
      const url = api(`/reduction/saved/${userId}`); // must match server route
      const res = await fetch(url);
      const text = await res.text();
      console.log('[fetchReductions] GET', url, 'status:', res.status, 'body:', text);
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const list: ReductionRow[] = Array.isArray(json?.items) ? json.items : [];
      setReduceItems(list);
      const total = list.reduce((sum, it) => sum + Number(it.point_value || 0), 0);
      setTotalReduction(total);
    } catch (e: any) {
      setReduceError(e?.message || 'Failed to load reductions');
      setReduceItems([]);
      setTotalReduction(0);
    } finally {
      setLoadingReduce(false);
    }
  }, [userId]);

  // ✅ preload emission & reduction once so both totals show immediately
  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    fetchReductions();
  }, [fetchReductions]);

  // lazy-load lists only when opening the "Saved" panels
  useEffect(() => {
    if (openSaved && items.length === 0 && !loading) fetchSaved();
  }, [openSaved, items.length, loading, fetchSaved]);

  useEffect(() => {
    if (openReduce && reduceItems.length === 0 && !loadingReduce) fetchReductions();
  }, [openReduce, reduceItems.length, loadingReduce, fetchReductions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSaved();
    } finally {
      setRefreshing(false);
    }
  }, [fetchSaved]);

  const onRefreshReduce = useCallback(async () => {
    setRefreshingReduce(true);
    try {
      await fetchReductions();
    } finally {
      setRefreshingReduce(false);
    }
  }, [fetchReductions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emission</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          openSaved
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            : openReduce
            ? <RefreshControl refreshing={refreshingReduce} onRefresh={onRefreshReduce} />
            : undefined
        }
      >
        {/* Card 1 — Calculate Emission */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Calculate</Text>
              <Text style={styles.cardTitle}>Emission</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Ionicons name="person-outline" size={14} color={theme.primaryDark} />
              <Text style={styles.chipText}>{peopleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Emission</Text>
            <Text style={[styles.valueBold, styles.valueDanger]}>
              {totalEmission.toFixed(2)} kgCO₂e
            </Text>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.goBtn}
              activeOpacity={0.9}
              onPress={() => navigation.push('EmissonCalculate', { user })}
            >
              <Ionicons name="calculator-outline" size={18} color="#FFF" />
              <Text style={styles.goBtnText}>Open Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              activeOpacity={0.8}
              onPress={() => setOpenSaved(s => !s)}
            >
              <Text style={styles.toggleText}>Saved</Text>
              <Ionicons
                name={openSaved ? 'chevron-down-outline' : 'chevron-forward-outline'}
                size={20}
                color={theme.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {/* Saved emission list */}
          {openSaved && (
            <View style={styles.savedWrap}>
              <View style={styles.savedRowHeader}>
                <Text style={styles.savedTitle}>Saved Emission Activities</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.rowRefresh} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={16} color={theme.primaryDark} />
                  <Text style={styles.rowRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : savingError ? (
                <Text style={styles.errorText}>{savingError}</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>No saved items yet</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedScroller}>
                  {items.map((it) => <EmissionCard key={it.id} item={it} />)}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Card 2 — Reduce Carbon */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardTitle}>Reduce</Text>
              <Text style={styles.cardTitle}>Carbon</Text>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="leaf-outline" size={28} color={theme.primaryDark} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Ionicons name="person-outline" size={14} color={theme.primaryDark} />
              <Text style={styles.chipText}>{peopleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Total Saved</Text>
            <Text style={styles.valueGreen}>{totalReduction.toFixed(2)} kgCO₂e</Text>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.goBtn}
              activeOpacity={0.9}
              onPress={() => navigation.push('ReduceCalculate', { user })}
            >
              <Ionicons name="swap-vertical" size={18} color="#FFF" />
              <Text style={styles.goBtnText}>Open Reducer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              activeOpacity={0.8}
              onPress={() => setOpenReduce(s => !s)}
            >
              <Text style={styles.toggleText}>Saved</Text>
              <Ionicons
                name={openReduce ? 'chevron-down-outline' : 'chevron-forward-outline'}
                size={20}
                color={theme.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {/* Saved reduction list */}
          {openReduce && (
            <View style={styles.savedWrap}>
              <View style={styles.savedRowHeader}>
                <Text style={styles.savedTitle}>Saved Reductions</Text>
                <TouchableOpacity onPress={onRefreshReduce} style={styles.rowRefresh} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={16} color={theme.primaryDark} />
                  <Text style={styles.rowRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loadingReduce ? (
                <View style={styles.center}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : reduceError ? (
                <Text style={styles.errorText}>{reduceError}</Text>
              ) : reduceItems.length === 0 ? (
                <Text style={styles.emptyText}>No reductions saved yet</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedScroller}>
                  {reduceItems.map((it) => <ReductionCard key={it.id} item={it} />)}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Calculation;

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerSide: { width: 28, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: theme.primaryDark, lineHeight: 26 },

  metaRow: { flexDirection: 'row', marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipText: { color: theme.primaryDark, fontWeight: '700' },

  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 14, color: theme.text, fontWeight: '700' },
  labelMuted: { fontSize: 13, color: theme.sub, fontWeight: '700' },

  valueBold: { fontSize: 16, fontWeight: '800', color: theme.text },
  valueMuted: { fontSize: 14, color: theme.sub, fontWeight: '600', marginTop: 2 },
  valueGreen: { fontSize: 16, fontWeight: '800', color: theme.primaryDark },
  valueDanger: { color: theme.danger },

  ctaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  goBtnText: { color: '#FFF', fontWeight: '800' },

  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleText: { color: theme.primaryDark, fontWeight: '800' },

  // saved section common
  savedWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
  },
  savedRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savedTitle: { fontSize: 16, fontWeight: '800', color: theme.text },

  rowRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowRefreshText: { color: theme.primaryDark, fontWeight: '700', fontSize: 12 },

  center: { paddingVertical: 10, alignItems: 'center' },
  loadingText: { marginTop: 6, color: theme.sub, fontSize: 12 },
  errorText: { color: '#B91C1C', fontWeight: '700' },
  emptyText: { color: theme.sub, fontWeight: '600' },

  // horizontal cards
  savedScroller: { paddingVertical: 6, gap: 12 },
  savedCard: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
    marginRight: 12,
  },
  savedCardTitle: { fontWeight: '800', color: theme.text, marginBottom: 6 },
  savedCardLine: { color: theme.sub, marginTop: 2, fontSize: 12 },
  savedCardStrong: { color: theme.primaryDark, fontWeight: '800' },
  emissionRed: { color: theme.danger },
  savedCardDate: { color: theme.sub, fontSize: 11, marginTop: 6 },
});
