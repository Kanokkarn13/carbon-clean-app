// src/screens/Home.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, User as StackUser } from './HomeStack';

import RecentActivityList from '../components/RecentActivityList';
import { evaluateActivityPoints, sumActivityPoints } from '../utils/points';

type HomeNav = NativeStackNavigationProp<RootStackParamList, any>;

type HomeUser = StackUser & {
  user_id?: string | number;
  fname?: string;
  lname?: string;
  profile_picture?: string;
};

type ActivityType = 'Cycling' | 'Walking';

export type Activity = {
  type: ActivityType;
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date | number;
  id?: string | number;

  carbonReduce?: number;
  carbon_reduce_kg?: number;
  carbon_reduce_g?: number;
  points?: number;
  points_valid?: boolean;
  points_reason?: string | null;
};

type Props = { navigation: HomeNav; user?: HomeUser };

// ===== API base from ENV (Expo) =====
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
const BASE_URL = RAW_BASE.replace(/\/+$/, '');
const api = (p: string) => `${BASE_URL}/api${p}`;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BASE_URL]', BASE_URL);
}

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

function toActivityType(input: unknown): ActivityType {
  const t = String(input ?? '').toLowerCase();
  if (t.includes('cycl')) return 'Cycling';
  return 'Walking';
}

function normalizeActivities(raw: any): Activity[] {
  const arr =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.activities) && raw.activities) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.results) && raw.results) ||
    (Array.isArray(raw?.items) && raw.items) ||
    [];
  const out: Activity[] = arr.map((r: any): Activity => {
    const type = toActivityType(r?.type ?? r?.activity_type);

    // distance -> km
    let distance_km = 0;
    if (r?.distance_km != null) distance_km = Number(r.distance_km);
    else if (r?.distance != null)
      distance_km = Number(r.distance) > 1000 ? Number(r.distance) / 1000 : Number(r.distance);
    else if (r?.meters != null) distance_km = Number(r.meters) / 1000;
    else if (r?.km != null) distance_km = Number(r.km);
    else if (r?.miles != null) distance_km = Number(r.miles) * 1.60934;

    // steps
    const step_total =
      r?.step_total != null
        ? Number(r.step_total)
        : r?.steps != null
        ? Number(r.steps)
        : r?.step_count != null
        ? Number(r.step_count)
        : r?.stepCount != null
        ? Number(r.stepCount)
        : undefined;

    // duration (sec)
    let duration_sec: number | undefined;
    if (r?.duration_sec != null) duration_sec = Number(r.duration_sec);
    else if (r?.duration_ms != null) duration_sec = Number(r.duration_ms) / 1000;
    else if (r?.milliseconds != null) duration_sec = Number(r.milliseconds) / 1000;
    else if (r?.minutes != null) duration_sec = Number(r.minutes) * 60;
    else if (r?.duration != null) {
      if (typeof r.duration === 'string' && r.duration.includes(':')) {
        const [h = '0', m = '0', s = '0'] = r.duration.split(':');
        duration_sec = +h * 3600 + +m * 60 + +s;
      } else {
        duration_sec = Number(r.duration);
      }
    }

    const record_date = r?.record_date ?? r?.date ?? r?.recorded_at ?? r?.start_time;

    const title =
      r?.title ??
      r?.name ??
      r?.activity_name ??
      r?.workout_name ??
      `${type}${distance_km ? ` ${distance_km.toFixed(2)} km` : ''}`;

    const description =
      r?.description ??
      r?.desciption ??
      r?.note ??
      r?.remarks ??
      r?.detail ??
      undefined;

    // carbon
    const carbonReduceKgRaw =
      r?.carbonReduce != null
        ? Number(r.carbonReduce)
        : r?.carbon_reduce_kg != null
        ? Number(r.carbon_reduce_kg)
        : undefined;
    const carbonReduceGRaw =
      r?.carbon_reduce_g != null ? Number(r.carbon_reduce_g) : undefined;

    const carbon_reduce_kg = Number.isFinite(carbonReduceKgRaw as number)
      ? (carbonReduceKgRaw as number)
      : Number.isFinite(carbonReduceGRaw as number)
      ? (carbonReduceGRaw as number) / 1000
      : undefined;

    const carbon_reduce_g = Number.isFinite(carbonReduceGRaw as number)
      ? (carbonReduceGRaw as number)
      : Number.isFinite(carbon_reduce_kg as number)
      ? (carbon_reduce_kg as number) * 1000
      : undefined;

    const evaluation = evaluateActivityPoints(
      {
        points: r?.points,
        point_value: r?.point_value,
        score: r?.score,
        duration_sec,
        duration: r?.duration,
        distance_km,
        step_total,
        type,
        activity: r?.activity ?? r?.activity_type,
      },
      duration_sec,
    );
    const points = evaluation.points;

    return {
      type,
      title,
      description,
      distance_km: Number(distance_km ?? 0) || 0,
      step_total,
      duration_sec,
      record_date,
      id: r?.id ?? r?._id,
      carbonReduce: carbon_reduce_kg,
      carbon_reduce_kg,
      carbon_reduce_g,
      points,
      points_valid: evaluation.valid,
      points_reason: evaluation.reason ?? null,
    };
  });

  if (__DEV__ && out.length) {
    // eslint-disable-next-line no-console
    console.log('[Home] normalizeActivities sample:', out[0]);
  }
  return out;
}

/** -------- Helpers for distance & time display -------- */
function formatDistance(kmInput?: number) {
  const km = Number(kmInput ?? 0);
  const wholeKm = Math.floor(km);
  let meters = Math.round((km - wholeKm) * 1000);
  if (meters === 1000) return `${wholeKm + 1} km`;
  if (wholeKm <= 0) return `${meters} m`;
  if (meters <= 0) return `${wholeKm} km`;
  return `${wholeKm} km ${meters} m`;
}

function parseRecordDate(input: any): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // 10/13-digit epoch (sec/ms)
    return new Date(input < 1e11 ? input * 1000 : input);
  }

  if (typeof input === 'string') {
    let s = input.trim();
    if (/[zZ]$/.test(s)) s = s.replace(/[zZ]$/, '');
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T');
    return new Date(s);
  }

  return undefined;
}

function formatWhen(record_date: any): string {
  const d = parseRecordDate(record_date);
  if (!d || isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} days ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
/** ----------------------------------------------------- */

const Home: React.FC<Props> = ({ user: userProp, navigation }) => {
  const route = useRoute<any>();
  const routeUser = route?.params?.user as HomeUser | undefined;
  const user = userProp ?? routeUser;
  const isFocused = useIsFocused();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressType, setProgressType] = useState<ActivityType>('Walking');

  // totals
  const [totalEmission, setTotalEmission] = useState<number>(0);
  const [emissionLoading, setEmissionLoading] = useState<boolean>(false);
  const [totalReduction, setTotalReduction] = useState<number>(0);
  const [reductionLoading, setReductionLoading] = useState<boolean>(false);

  // Accept user_id or id
  const uid = useMemo(() => {
    if (!user) return undefined;
    const v = user.user_id ?? (user as any).id;
    return v != null ? String(v) : undefined;
  }, [user]);

  const fetchEmissionTotal = useCallback(async () => {
    if (!uid) {
      setTotalEmission(0);
      return;
    }
    setEmissionLoading(true);
    try {
      const res = await fetch(api(`/saved/${encodeURIComponent(uid)}`), { keepalive: true });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const items: any[] = Array.isArray(json?.items) ? json.items : [];
      const sum = items.reduce((acc, it) => acc + Number(it?.point_value || 0), 0);
      setTotalEmission(sum);
    } catch {
      setTotalEmission(0);
    } finally {
      setEmissionLoading(false);
    }
  }, [uid]);

  const fetchReductionTotal = useCallback(async () => {
    if (!uid) {
      setTotalReduction(0);
      return;
    }
    setReductionLoading(true);
    try {
      const res = await fetch(api(`/reduction/saved/${encodeURIComponent(uid)}`), {
        keepalive: true,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const items: any[] = Array.isArray(json?.items) ? json.items : [];
      const sum = items.reduce((acc, it) => acc + Number(it?.point_value || 0), 0);
      setTotalReduction(sum);
    } catch {
      setTotalReduction(0);
    } finally {
      setReductionLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (isFocused) {
      fetchEmissionTotal();
      fetchReductionTotal();
    }
  }, [isFocused, fetchEmissionTotal, fetchReductionTotal]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!uid || !isFocused) {
        if (!uid) setActivities([]);
        return;
      }
      setLoading(true);

      const tryUrls = [
        api(`/recent-activity/full/${encodeURIComponent(uid)}`),
        api(`/recent-activity/${encodeURIComponent(uid)}`),
      ];
      const urlPost = api(`/recent-activity`);

      try {
        let data: any | undefined;

        for (const url of tryUrls) {
          try {
            const res = await fetch(url, { keepalive: true });
            if (!res.ok) continue;
            const j = await res.json();
            const arr =
              (Array.isArray(j) && j) ||
              (Array.isArray(j?.activities) && j.activities) ||
              (Array.isArray(j?.data) && j.data) ||
              (Array.isArray(j?.results) && j.results) ||
              (Array.isArray(j?.items) && j.items) ||
              [];
            if (arr.length >= 0) {
              data = j;
              break;
            }
          } catch {}
        }

        if (!data) {
          const resPost = await fetch(urlPost, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid }),
            keepalive: true,
          });
          if (resPost.ok) data = await resPost.json();
        }

        const list = normalizeActivities(data || []);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[Home] activities normalized[0]', list[0]);
        }
        setActivities(list);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [isFocused, uid]);

  const fullName =
    user?.fname || user?.lname
      ? `${user?.fname ?? ''} ${user?.lname ?? ''}`.trim()
      : 'Guest';

  const walkingDistance = useMemo(
    () =>
      activities
        .filter((a) => a.type === 'Walking')
        .reduce((sum, a) => sum + (Number(a.distance_km) || 0), 0),
    [activities],
  );
  const cyclingDistance = useMemo(
    () =>
      activities
        .filter((a) => a.type === 'Cycling')
        .reduce((sum, a) => sum + (Number(a.distance_km) || 0), 0),
    [activities],
  );

  const toGoalNumber = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const walkingGoal = useMemo(
    () =>
      toGoalNumber(
        (user as any)?.walk_goal ??
          (user as any)?.walkGoal ??
          (user as any)?.walking_goal ??
          (user as any)?.walkingGoal,
      ),
    [user],
  );
  const cyclingGoal = useMemo(
    () =>
      toGoalNumber(
        (user as any)?.bic_goal ??
          (user as any)?.bike_goal ??
          (user as any)?.cycling_goal ??
          (user as any)?.cyclingGoal,
      ),
    [user],
  );

  const progressPercent = useMemo(() => {
    const distance = progressType === 'Walking' ? walkingDistance : cyclingDistance;
    const goal = progressType === 'Walking' ? walkingGoal : cyclingGoal;
    if (!goal || goal <= 0) return 0;
    return Math.min(100, (distance / goal) * 100);
  }, [progressType, walkingDistance, cyclingDistance, walkingGoal, cyclingGoal]);

  const progressDistance = progressType === 'Walking' ? walkingDistance : cyclingDistance;
  const progressGoal = progressType === 'Walking' ? walkingGoal : cyclingGoal;

  const totalRecentPoints = useMemo(() => sumActivityPoints(activities), [activities]);

  const pointsBadgeLabel = `${totalRecentPoints.toLocaleString()} P`;

  const diff = totalReduction - totalEmission;
  const diffColor = diff >= 0 ? styles.statPositive : styles.statNegative;
  const diffText = `${diff.toFixed(2)} kgCO₂e`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri:
                  user?.profile_picture ||
                  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.name}>{fullName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pointsBadge}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('Reward', {
                user,
                totalPoints: totalRecentPoints,
                activities,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="View rewards"
          >
            <Ionicons name="sparkles-outline" size={14} color={theme.primaryDark} />
            <Text style={styles.pointsText}>{pointsBadgeLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Task / Goal card (fixed banner background) */}
        <View style={[styles.card, { padding: 0, borderRadius: 16, overflow: 'hidden' }]}>
          <ImageBackground
            source={require('../../assets/trees.png')}
            resizeMode="cover"
            style={{ minHeight: 170, paddingHorizontal: 20, paddingVertical: 24, justifyContent: 'center' }}
            imageStyle={{ borderRadius: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.cardTitle}>Complete your tasks</Text>
                <View style={styles.progressToggleRow}>
                  <TouchableOpacity
                    style={[styles.progressChip, progressType === 'Walking' && styles.progressChipActive]}
                    onPress={() => setProgressType('Walking')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.progressChipText,
                        progressType === 'Walking' && styles.progressChipTextActive,
                      ]}
                    >
                      Walking
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.progressChip, progressType === 'Cycling' && styles.progressChipActive]}
                    onPress={() => setProgressType('Cycling')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.progressChipText,
                        progressType === 'Cycling' && styles.progressChipTextActive,
                      ]}
                    >
                      Cycling
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.progressBig}>{Math.round(progressPercent)}%</Text>
                <Text style={styles.progressSub}>
                  {progressGoal > 0
                    ? `${progressDistance.toFixed(2)} / ${progressGoal.toFixed(2)} km`
                    : `${progressDistance.toFixed(2)} km tracked`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.pillBtn}
                onPress={() => (navigation as any).navigate('SetGoal', { user })}
                activeOpacity={0.9}
              >
                <Ionicons name="flag-outline" size={16} color={theme.primaryDark} />
                <Text style={styles.pillBtnText}>Set your goal</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => (navigation as any).navigate('Dashboard', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="speedometer-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => (navigation as any).navigate('Calculation', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="calculator-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Calculate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => (navigation as any).navigate('RedeemHistory', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="gift-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Redeem History</Text>
          </TouchableOpacity>
        </View>

        {/* Activity summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Emission vs Reduction of all time</Text>
          <TouchableOpacity
            style={styles.activityBox}
            onPress={() => (navigation as any).navigate('Calculation', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.co2Circle}>
              <Ionicons name="trending-down-outline" size={18} color={theme.primary} />
              <Text style={styles.co2XX}>Calculate</Text>
            </View>
            <View style={styles.activityInfo}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Emission</Text>
                <Text style={styles.statValue}>
                  {emissionLoading ? '…' : `${totalEmission.toFixed(2)} kgCO₂e`}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Reduction</Text>
                <Text style={styles.statPositive}>
                  {reductionLoading ? '…' : `${totalReduction.toFixed(2)} kgCO₂e`}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Difference</Text>
                <Text style={[styles.statValue, diffColor]}>{diffText}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity (component) */}
        <RecentActivityList
          title="Tracking History"
          activities={activities}
          loading={loading}
          onItemPress={(activity) => (navigation as any).navigate('RecentAct', { activity })}
        />

        {__DEV__ && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.sub, fontSize: 12 }}>
              user_id: {user?.user_id ?? '—'} | focused: {String(isFocused)} | API: {BASE_URL}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff' },
  greeting: { fontSize: 12, color: theme.sub },
  name: { fontSize: 18, fontWeight: '700', color: theme.text },
  pointsBadge: {
    backgroundColor: theme.chip, borderWidth: 1, borderColor: '#D1FAE5',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', gap: 6
  },
  pointsText: { color: theme.primaryDark, fontWeight: '700' },

  card: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3
  },
  cardTitle: { color: theme.text, fontWeight: '700', fontSize: 16 },

  taskBg: { borderRadius: 16 }, // kept simple; we control sizing inline

  progressBig: {
    fontSize: 44, lineHeight: 44, fontWeight: '900', color: '#a7fd95ff',
    marginTop: 8, marginBottom: 4,
  },
  progressSub: { color: '#FFFFFF', fontWeight: '600' },
  progressToggleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  progressChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  progressChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: theme.primaryDark,
  },
  progressChipText: { fontWeight: '700', color: theme.sub },
  progressChipTextActive: { color: theme.primaryDark },
  progressBarWrap: {
    height: 14, backgroundColor: '#E9F5EF', borderRadius: 999,
    marginTop: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#D9EAE2',
  },
  progressBarFill: {
    height: '100%', backgroundColor: theme.primary, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },

  pillBtn: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.border,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', gap: 8
  },
  pillBtnText: { color: theme.primaryDark, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border
  },
  quickIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.chip,
    alignItems: 'center', justifyContent: 'center'
  },
  quickLabel: { fontWeight: '700', color: theme.text },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
  activityBox: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 14,
    flexDirection: 'row', padding: 14, gap: 14, alignItems: 'center'
  },
  co2Circle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: theme.chip,
    borderWidth: 1, borderColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', gap: 6
  },
  co2XX: { fontSize: 14, fontWeight: '800', color: theme.primaryDark },
  activityInfo: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: theme.sub, fontSize: 12 },
  statValue: { color: theme.text, fontWeight: '700' },
  statMuted: { color: theme.sub, fontWeight: '600' },
  statPositive: { color: theme.primaryDark, fontWeight: '700' },
  statNegative: { color: theme.danger, fontWeight: '700' },

  emptyState: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 14, alignItems: 'center', gap: 6
  },
  emptyText: { color: theme.sub },

  recentItem: {
    marginTop: 10, padding: 12, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12
  },
  recentIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.chip,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1FAE5'
  },
  recentTitle: { fontWeight: '700', color: theme.text },
  recentSub: { color: theme.sub, marginTop: 2 },
});

export default Home;
