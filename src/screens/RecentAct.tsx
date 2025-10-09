// src/screens/RecentAct.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeStack';
import type { ActivityPayload } from '../types/activity';

// ----- (optional) MapView ถ้ามีแพคเกจ -----
let MapView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapView = require('react-native-maps').default;
} catch (e) {
  MapView = null;
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecentAct'>;

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
  chipBorder: '#D1FAE5',
  muted: '#F3F4F6',
};

function fmtNumber(n?: number, digits = 0) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

function fmtDuration(sec?: number) {
  if (typeof sec !== 'number' || Number.isNaN(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}:${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}`;
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

function fmtDate(dt?: string | Date) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  // ตัวอย่างภาพ: 8 OCT 2025 15:44–16:41 (ในโค้ดนี้แสดงเป็น Local string ย่อๆ)
  const date = d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date}  ·  ${time}`;
}

const RecentAct: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const activity: ActivityPayload | undefined = route?.params?.activity;

  const title = activity?.title || activity?.type || 'Title';
  const description = activity?.description || '';
  const distanceKm = typeof activity?.distance_km === 'number' ? activity.distance_km : undefined;
  const steps =
    typeof activity?.step_total === 'number' ? activity.step_total.toLocaleString() : undefined;
  const duration = fmtDuration(activity?.duration_sec);
  const recordDate = fmtDate(activity?.record_date ?? activity?.created_at);
  const carbonG =
    typeof (activity as any)?.carbon_reduce_g === 'number'
      ? (activity as any).carbon_reduce_g
      : undefined;
  const points =
    typeof (activity as any)?.points === 'number' ? (activity as any).points : undefined;

  // progress_pct: 0..1 (fallback 0.3)
  const progressPct =
    typeof (activity as any)?.progress_pct === 'number' && !Number.isNaN((activity as any).progress_pct)
      ? Math.max(0, Math.min(1, (activity as any).progress_pct))
      : 0.3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Map Box ===== */}
        <View style={styles.mapWrap}>
          {MapView ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: 13.7563,
                longitude: 100.5018,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              pointerEvents="none"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
              <Ionicons name="map" size={28} color={theme.sub} />
              <Text style={{ color: theme.sub, marginTop: 6 }}>Map preview</Text>
            </View>
          )}

          {/* Segmented mimic: Map / Satellite */}
          <View style={styles.mapTabs}>
            <View style={[styles.mapTab, styles.mapTabActive]}>
              <Text style={styles.mapTabTextActive}>Map</Text>
            </View>
            <View style={styles.mapTab}>
              <Text style={styles.mapTabText}>Satellite</Text>
            </View>
          </View>
        </View>

        {/* ===== Summary Card ===== */}
        <View style={styles.card}>
          {/* Title */}
          <View style={styles.rowBetween}>
            <Text style={styles.labelBold}>Title:</Text>
            <Text style={[styles.linkTitle]} numberOfLines={1}>
              {title || '—'}
            </Text>
          </View>

          {/* Description box (readonly look) */}
          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{description || ' '}</Text>
          </View>

          {/* Date & Points & Duration */}
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateMain}>{recordDate}</Text>
              {/* ช่วงเวลาละเอียดสามารถเพิ่มเองตามข้อมูลที่มี */}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.pointLabel}>Point Recieved</Text>
              <View style={styles.pointChip}>
                <Text style={styles.pointChipText}>
                  {typeof points === 'number' ? `${points} P` : '2000 P'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rowBetweenTight}>
            <View style={{}}>
              <Text style={[styles.smallMuted]}>Duration</Text>
              <Text style={[styles.durationText]}>{duration}</Text>
            </View>
          </View>
        </View>

        {/* ===== Stats Row (Carbon & Distance) ===== */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="leaf" size={18} color={theme.primaryDark} />
            </View>
            <Text style={styles.statValue}>
              {fmtNumber(carbonG ?? 144, 0)} <Text style={styles.statUnit}>g</Text>
            </Text>
            <Text style={styles.statLabel}>carbon reduce</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="location" size={18} color={theme.primaryDark} />
            </View>
            <Text style={styles.statValue}>
              {fmtNumber(distanceKm, 2) ?? '1.44'} <Text style={styles.statUnit}>km</Text>
            </Text>
            <Text style={styles.statLabel}>distance</Text>
          </View>
        </View>

        {/* ===== Progress ===== */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressTitle}>Your Current Progress</Text>

          <View style={styles.progressHeader}>
            <View style={styles.progressRing}>
              <Ionicons name="checkmark" size={18} color={theme.primaryDark} />
            </View>
            <Text style={styles.progressPctText}>
              {Math.round(progressPct * 100)}%
              <Text style={styles.progressSub}> from your goal</Text>
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progressPct * 100)}%` }]} />
          </View>
        </View>

        {/* (ออปชัน) ขอบล่างให้มีพื้นที่พอสำหรับแท็บจริงของแอป */}
        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const RADIUS = 16;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: theme.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.chipBorder,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    color: theme.text,
    marginRight: 36,
  },

  mapWrap: {
    height: 220,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: theme.muted,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTabs: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 3,
    borderRadius: 10,
  },
  mapTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  mapTabActive: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mapTabText: {
    color: theme.sub,
    fontSize: 12,
    fontWeight: '600',
  },
  mapTabTextActive: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: theme.card,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowBetweenTight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  labelBold: { color: theme.text, fontWeight: '800', fontSize: 16 },
  linkTitle: { color: theme.primaryDark, fontWeight: '800', fontSize: 16 },

  label: { color: theme.sub, fontSize: 12, fontWeight: '700' },
  descBox: {
    marginTop: 6,
    minHeight: 64,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  descText: { color: theme.sub, fontSize: 14 },

  dateMain: { color: theme.text, fontSize: 14, fontWeight: '700' },

  pointLabel: {
    color: theme.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  pointChip: {
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.chipBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  pointChipText: { color: theme.text, fontWeight: '800' },

  smallMuted: { color: theme.sub, fontSize: 11, marginTop: 8 },
  durationText: { color: theme.text, fontWeight: '700', marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.chipBorder,
    marginBottom: 10,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.text },
  statUnit: { fontSize: 14, fontWeight: '700', color: theme.text },
  statLabel: { marginTop: 4, color: theme.sub, fontSize: 12 },

  progressWrap: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: theme.card,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  progressTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.chipBorder,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPctText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  progressSub: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.sub,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
});

export default RecentAct;
