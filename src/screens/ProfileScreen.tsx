import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getUser } from '../services/authService';

// =========================
// Types & Theme
// =========================
type Navigation = NativeStackNavigationProp<any>;

// Type the route so route.params?.user is known to TS and safe at runtime
type ProfileStackParamList = {
  ProfileMain: { user: any } | undefined;
  ProfileEdit: { user: any } | undefined;
};

const theme = {
  green: '#22C55E',
  greenDark: '#16A34A',
  blue: '#3B82F6',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

// =========================
// Config
// =========================
const API_BASE = 'http://192.168.0.102:3000';
const FAKE_CARBON_KG = 0.14 as const;

// =========================
// Component
// =========================
export default function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'ProfileMain'>>();
  const routeUser = route.params?.user ?? null;

  const [user, setUser] = useState<any | null>(routeUser);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [mode, setMode] = useState<'sum' | 'walk' | 'cycle'>('sum');

  // -------------------------
  // Load user + activities
  // -------------------------
  const loadAll = async () => {
    setLoading(true);
    try {
      // fall back to local storage / backend if route didn’t carry the user
      const u = routeUser ?? (await getUser());
      setUser(u || null);

      if (u?.user_id) {
        const res = await fetch(`${API_BASE}/api/recent-activity/${u.user_id}`);
        const json = await res.json();
        const arr = Array.isArray(json.activities) ? json.activities : [];
        setActivities(
          arr.map((a: any) => ({
            ...a,
            distance_km: Number(a.distance_km) || 0,
            type: a.type || 'Activity',
          }))
        );
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error('❌ Failed to load profile data:', e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUser]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // -------------------------
  // Compute progress values
  // -------------------------
  const { walkingPct, cyclingPct, totalWalkKm, totalCycleKm } = useMemo(() => {
    const totalWalk = activities
      .filter((a) => a.type === 'Walking')
      .reduce((s, a) => s + a.distance_km, 0);
    const totalCycle = activities
      .filter((a) => a.type === 'Cycling')
      .reduce((s, a) => s + a.distance_km, 0);

    const walkGoal = Math.max(1, Number(user?.walk_goal) || 100);
    const cycleGoal = Math.max(1, Number(user?.bic_goal) || 100);

    return {
      walkingPct: Math.min((totalWalk / walkGoal) * 100, 100),
      cyclingPct: Math.min((totalCycle / cycleGoal) * 100, 100),
      totalWalkKm: totalWalk,
      totalCycleKm: totalCycle,
    };
  }, [activities, user]);

  // -------------------------
  // Loading & Empty states
  // -------------------------
  if (loading)
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.greenDark} />
      </SafeAreaView>
    );

  if (!user)
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.empty}>No user data available</Text>
        <TouchableOpacity onPress={loadAll} style={styles.reloadBtn} activeOpacity={0.9}>
          <Text style={styles.reloadText}>Reload</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // -------------------------
  // Fake carbon + distance
  // -------------------------
  const carbonKg = FAKE_CARBON_KG;
  const trees = Math.floor(carbonKg / 50);
  const stadiumRounds = Math.round((totalWalkKm + totalCycleKm) / 0.4);

  // -------------------------
  // Render UI
  // -------------------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* === Header === */}
        <Text style={styles.header}>Profile</Text>

        {/* === Profile Card === */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                user?.profile_picture ||
                'https://preview.redd.it/help-me-find-instagram-account-of-this-cat-he-she-looks-so-v0-twu4der3mpud1.jpg?width=640&crop=smart&auto=webp&s=e50ba618c5b563dc1dc37dc98e6fb8c29276dafd',
            }}
            style={styles.profileImage}
          />
          <Text style={styles.userName}>
            {user?.fname ?? ''} {user?.lname ?? ''}
          </Text>

          <View style={styles.pointChip}>
            <Text style={styles.pointText}>{user?.points ?? 0} P</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProfileEdit', { user })}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* === Progress Section === */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressHeader}>Your Progress</Text>

            {/* Toggle Switch */}
            <View style={styles.toggleContainer}>
              {(['sum', 'walk', 'cycle'] as const).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setMode(key)}
                  style={[
                    styles.toggleBtn,
                    mode === key && { backgroundColor: theme.green },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: mode === key ? '#fff' : theme.text },
                    ]}
                  >
                    {key === 'sum' ? 'Sum' : key === 'walk' ? 'Walking' : 'Cycling'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Carbon */}
          {mode === 'sum' && (
            <View style={styles.progressRow}>
              <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="leaf-outline" size={20} color={theme.greenDark} />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={[styles.progressNumber, { color: theme.greenDark }]}>
                  {formatNum(carbonKg)} Kg
                </Text>
                <Text style={styles.progressDesc}>
                  You have saved {formatNum(carbonKg)} Kg of carbon! That’s equivalent to {trees}{' '}
                  {trees === 1 ? 'tree' : 'trees'} planted.
                </Text>
              </View>
            </View>
          )}

          {/* Walk/Cycle Progress */}
          {(mode === 'sum' || mode === 'walk' || mode === 'cycle') && (
            <View style={styles.dualRow}>
              {(mode === 'sum' || mode === 'walk') && (
                <View style={styles.progressCard}>
                  <View style={[styles.iconWrapSmall, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="walk-outline" size={18} color={theme.greenDark} />
                  </View>
                  <Text style={styles.cardLabel}>Walking progress</Text>
                  <Text style={[styles.cardValue, { color: theme.greenDark }]}>
                    {walkingPct.toFixed(1)}%
                  </Text>
                </View>
              )}
              {(mode === 'sum' || mode === 'cycle') && (
                <View style={styles.progressCard}>
                  <View style={[styles.iconWrapSmall, { backgroundColor: '#EAF2FE' }]}>
                    <Ionicons name="bicycle-outline" size={18} color={theme.blue} />
                  </View>
                  <Text style={styles.cardLabel}>Cycling progress</Text>
                  <Text style={[styles.cardValue, { color: theme.blue }]}>
                    {cyclingPct.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Distance */}
          {mode === 'sum' && (
            <View style={styles.progressRow}>
              <View style={[styles.iconWrap, { backgroundColor: '#EAF2FE' }]}>
                <Ionicons name="location-outline" size={20} color={theme.blue} />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={[styles.progressNumber, { color: theme.blue }]}>
                  {formatNum(totalWalkKm + totalCycleKm)} km
                </Text>
                <Text style={styles.progressDesc}>
                  You have travelled {formatNum(totalWalkKm + totalCycleKm)} Km — around {stadiumRounds} stadium rounds!
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================
// Helper
// =========================
function formatNum(n?: number) {
  const num = Number(n ?? 0);
  return num < 10 ? num.toFixed(2) : num.toFixed(1);
}

// =========================
// Styles
// =========================
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: theme.sub, fontWeight: '700' },
  reloadBtn: {
    marginTop: 12,
    backgroundColor: theme.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reloadText: { color: '#fff', fontWeight: '700' },

  container: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 48 },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    marginTop: 10,
    marginBottom: 18,
  },

  profileCard: { alignItems: 'center', marginBottom: 28 },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.green,
    resizeMode: 'cover',
    marginBottom: 14,
  },
  userName: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8 },
  pointChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  pointText: { color: theme.text, fontWeight: '800' },
  editBtn: {
    backgroundColor: theme.green,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  editBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  progressSection: { width: '100%' },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressHeader: { fontSize: 18, fontWeight: '800', color: theme.text },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 2,
  },
  toggleText: { fontSize: 12, fontWeight: '700' },

  progressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTextWrap: { marginLeft: 10, flex: 1 },
  progressNumber: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  progressDesc: { fontSize: 13, color: theme.sub },

  dualRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  progressCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    alignItems: 'center',
  },
  iconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardLabel: { color: theme.sub, fontWeight: '700' },
  cardValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
});
