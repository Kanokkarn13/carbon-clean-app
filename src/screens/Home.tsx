// src/screens/Home.tsx
import React, { useEffect, useState } from 'react';
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

// ---------- Types ----------
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
  record_date?: string | Date | number; // supports ISO, 'YYYY-MM-DD HH:mm:ss', ms/sec timestamp
  id?: string | number;
};

type Props = {
  navigation: HomeNav;
  user?: HomeUser; // may be undefined if not passed as prop
};
// ---------------------------

// .env (recommended): EXPO_PUBLIC_API_URL=http://192.168.0.100:3000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.100:3000';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
};

function toActivityType(input: unknown): ActivityType {
  const t = String(input ?? '').toLowerCase();
  if (t.includes('cycl')) return 'Cycling';
  return 'Walking';
}

/**
 * Normalize activity payload from various backends.
 */
function normalizeActivities(raw: any): Activity[] {
  const arr =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.activities) && raw.activities) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.results) && raw.results) ||
    (Array.isArray(raw?.items) && raw.items) ||
    [];

  return arr.map((r: any): Activity => {
    const type = toActivityType(r?.type ?? r?.activity_type);

    // distance -> km
    let distance_km = 0;
    if (r?.distance_km != null) distance_km = Number(r.distance_km);
    else if (r?.distance != null)
      distance_km =
        Number(r.distance) > 1000 ? Number(r.distance) / 1000 : Number(r.distance);
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

    const record_date =
      r?.record_date ?? r?.date ?? r?.recorded_at ?? r?.start_time;

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

    return {
      type,
      title,
      description,
      distance_km: Number(distance_km ?? 0) || 0,
      step_total,
      duration_sec,
      record_date,
      id: r?.id ?? r?._id,
    };
  });
}

/** -------- Helpers for distance & time display -------- */
function formatDistance(kmInput?: number) {
  const km = Number(kmInput ?? 0);
  const wholeKm = Math.floor(km);
  let meters = Math.round((km - wholeKm) * 1000);

  // Handle rounding up like 0.9996 km -> 1.000 km (avoid "1000 m")
  if (meters === 1000) {
    return `${wholeKm + 1} km`;
  }
  if (wholeKm <= 0) return `${meters} m`;
  if (meters <= 0) return `${wholeKm} km`;
  return `${wholeKm} km ${meters} m`;
}

function parseRecordDate(input: any): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // Support ms or sec timestamps (heuristic)
    if (input < 1e11) return new Date(input * 1000);
    return new Date(input);
  }

  if (typeof input === 'string') {
    const s = input.trim();
    // MySQL 'YYYY-MM-DD HH:mm:ss'
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
      return new Date(s.replace(' ', 'T'));
    }
    // ISO and other common forms
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

  // > 1 week: show date (adjust locale/format as needed)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
/** ----------------------------------------------------- */

const Home: React.FC<Props> = ({ user: userProp, navigation }) => {
  const route = useRoute<any>();
  const routeUser = route?.params?.user as HomeUser | undefined;
  const user = userProp ?? routeUser;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  // Accept user_id or id
  function getUserId(u?: { user_id?: string | number; id?: string | number }) {
    if (!u) return undefined;
    return (u.user_id ?? u.id) != null ? String(u.user_id ?? u.id) : undefined;
  }

  useEffect(() => {
    const fetchActivities = async () => {
      const uid = getUserId(user);
      console.log('[Home] effective user =', user);
      console.log('[Home] isFocused =', isFocused, '| uid =', uid);

      if (!uid) {
        console.log('[Home] skip: no user id');
        setActivities([]);
        return;
      }
      if (!isFocused) {
        console.log('[Home] skip: not focused');
        return;
      }

      setLoading(true);

      const tryUrls = [
        `${BASE_URL}/api/recent-activity/full/${encodeURIComponent(uid)}`,
        `${BASE_URL}/api/recent-activity/${encodeURIComponent(uid)}`,
      ];
      const urlPost = `${BASE_URL}/api/recent-activity`;

      try {
        let data: any | undefined;

        for (const url of tryUrls) {
          console.log('[RecentActivity] TRY', url);
          try {
            const res = await fetch(url);
            console.log('[RecentActivity] status', res.status, 'for', url);
            if (!res.ok) continue;
            const j = await res.json();
            const arr =
              (Array.isArray(j) && j) ||
              (Array.isArray(j?.activities) && j.activities) ||
              (Array.isArray(j?.data) && j.data) ||
              (Array.isArray(j?.results) && j.results) ||
              (Array.isArray(j?.items) && j.items) ||
              [];
            console.log('[RecentActivity] array length from', url, '=', arr.length);
            data = j;
            break;
          } catch (e) {
            console.log('[RecentActivity] try failed', url, e);
          }
        }

        if (!data) {
          console.log('[RecentActivity] fallback POST', urlPost);
          const resPost = await fetch(urlPost, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid }),
          });
          console.log('[RecentActivity] POST status', resPost.status);
          if (resPost.ok) data = await resPost.json();
        }

        if (!data) {
          console.log('[RecentActivity] no data from any endpoint');
          setActivities([]);
          return;
        }

        console.log('[RecentActivity] payload', data);
        const list = normalizeActivities(data);
        if (__DEV__ && list[0]) console.log('[RecentActivity] normalized sample:', list[0]);
        console.log('[RecentActivity] final length =', list.length);
        setActivities(list.slice(0, 10));
      } catch (e) {
        console.warn('[RecentActivity] fetch error:', e);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [isFocused, user?.user_id, user?.id]);

  const handleActivityPress = () => navigation.navigate('Calculation');

  const fullName =
    user?.fname || user?.lname
      ? `${user?.fname ?? ''} ${user?.lname ?? ''}`.trim()
      : 'Guest';

  const goToRecentAct = (activity: Activity) => {
    (navigation as any).navigate('RecentAct', { activity });
  };

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
          <View style={styles.pointsBadge}>
            <Ionicons name="sparkles-outline" size={14} color={theme.primaryDark} />
            <Text style={styles.pointsText}>0 P</Text>
          </View>
        </View>

        {/* Task / Goal card */}
        <View style={styles.card}>
          <ImageBackground
            source={require('../../assets/trees.png')}
            style={styles.taskBg}
            imageStyle={{ borderRadius: 16, opacity: 0.12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.cardTitle}>Complete your tasks</Text>
                <Text style={styles.progressBig}>0%</Text>
                <View style={styles.progressBarWrap}>
                  <View style={[styles.progressBarFill, { width: '0%' }]} />
                </View>
              </View>
              <TouchableOpacity
                style={styles.pillBtn}
                onPress={() => navigation.navigate('SetGoal', { user })}
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
            onPress={() => navigation.navigate('Dashboard', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="speedometer-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Calculation')}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="calculator-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Calculate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('SetGoal', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="leaf-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Goals</Text>
          </TouchableOpacity>
        </View>

        {/* Activity summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <TouchableOpacity style={styles.activityBox} onPress={handleActivityPress} activeOpacity={0.9}>
            <View style={styles.co2Circle}>
              <Ionicons name="trending-down-outline" size={18} color={theme.primary} />
              <Text style={styles.co2XX}>Calculate</Text>
            </View>
            <View style={styles.activityInfo}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Emission</Text>
                <Text style={styles.statValue}>0.00 kgCO₂e</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last month</Text>
                <Text style={styles.statMuted}>0.00 kgCO₂e</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statPositive}>0.00 kgCO₂e</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={18} color={theme.sub} />
              <Text style={styles.emptyText}>No recent activity yet</Text>
            </View>
          ) : (
            activities.map((activity, idx) => {
              const iconName =
                activity.type === 'Cycling' ? 'bicycle-outline' : 'walk-outline';
              return (
                <TouchableOpacity
                  key={`${activity.type}-${activity.id ?? idx}-${activity.record_date ?? idx}`}
                  style={styles.recentItem}
                  activeOpacity={0.9}
                  onPress={() => goToRecentAct(activity)}
                >
                  <View style={styles.recentIcon}>
                    <Ionicons name={iconName as any} size={18} color={theme.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle}>
                      {activity.title || activity.type}
                    </Text>
                    <Text style={styles.recentSub}>
                      {formatDistance(activity.distance_km)} · {formatWhen(activity.record_date)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.border} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* (Optional) Debug info – comment out in prod */}
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
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsText: { color: theme.primaryDark, fontWeight: '700' },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { color: theme.text, fontWeight: '700', fontSize: 16 },
  taskBg: { borderRadius: 16 },
  progressBig: { fontSize: 32, fontWeight: '800', color: theme.text, marginTop: 2 },
  progressBarWrap: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: { height: 8, backgroundColor: theme.primary, borderRadius: 999 },
  pillBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillBtnText: { color: theme.primaryDark, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontWeight: '700', color: theme.text },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
  activityBox: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 14,
    gap: 14,
    alignItems: 'center',
  },
  co2Circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  co2XX: { fontSize: 14, fontWeight: '800', color: theme.primaryDark },
  activityInfo: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: theme.sub, fontSize: 12 },
  statValue: { color: theme.text, fontWeight: '700' },
  statMuted: { color: theme.sub, fontWeight: '600' },
  statPositive: { color: theme.primaryDark, fontWeight: '700' },

  emptyState: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { color: theme.sub },

  recentItem: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  recentTitle: { fontWeight: '700', color: theme.text },
  recentSub: { color: theme.sub, marginTop: 2 },
});

export default Home;
