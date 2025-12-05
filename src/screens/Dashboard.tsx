// src/screens/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import theme from '../utils/theme';
import { baseLineChartConfig } from '../utils/chartConfig';
import { useDashboardSeries, Period } from '../hooks/useDashboardSeries';
import { fetchRecentActivities } from '../services/activityService';
import { fetchEmissionItems, fetchReductionItems, fetchCarbonLeaderboard, CarbonLeaderboardEntry } from '../services/totalsService';
// ❌ ลบ safeDate ออก เพื่อกันการบวก +7 อัตโนมัติ
// import { safeDate } from '../utils/date';
import ProgressStat from '../components/ProgressStat';
import SegmentedControl from '../components/SegmentedControl';
import NavPeriodButtons from '../components/NavPeriodButtons';

const screenWidth = Dimensions.get('window').width;
const SCREEN_PAD = 16;
const CARD_HPAD = 14;
const INNER_WIDTH = screenWidth - SCREEN_PAD * 2 - CARD_HPAD * 2;
const PIE_COLORS = {
  emission: '#EF233C',        // red pantone
  emissionLegend: '#97051D',  // deep carmine
  reduction: '#76BA9D',       // cambridge green
  reductionLegend: '#04361D', // dark green
};

/* ---------- date helpers (ไม่บวก +7) ---------- */
const isValidDate = (d: any) => d instanceof Date && !Number.isNaN(d.getTime());
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

/**
 * parseLocalBkk:
 * - ถ้าสตริงลงท้าย 'Z' (UTC) แต่ค่าจริงใน DB เป็นเวลาท้องถิ่น → ตัด Z ออกก่อน parse
 * - ถ้าสตริงไม่มีโซน → parse ตรง ๆ (ไม่เติม Z)
 * - ถ้าเป็น epoch sec/ms → แปลงตามปกติ
 */
function parseLocalBkk(input: any): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // epoch sec (10 หลัก) | ms (13 หลัก)
    return new Date(input < 1e11 ? input * 1000 : input);
  }

  if (typeof input === 'string') {
    let s = input.trim();

    // ลงท้าย Z ให้ตัดออก -> new Date() จะตีความเป็น local time (Asia/Bangkok บนเครื่อง)
    if (/[zZ]$/.test(s)) s = s.replace(/[zZ]$/, '');

    // "YYYY-MM-DD HH:mm(:ss)" → เสถียรขึ้นด้วย T แต่ไม่เติมโซน
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T');

    // อย่าเติม Z เพิ่ม เด็ดขาด
    return new Date(s);
  }
  return undefined;
}

/* ---------- misc helpers ---------- */
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pctText = (v: number) => `${num(v).toFixed(2)}%`;

function getRange(period: Period, offset: number) {
  const now = new Date();
  if (period === 'week') {
    const base = startOfDay(now);
    const monIdx = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - monIdx + offset * 7);
    const end = new Date(base); end.setDate(base.getDate() + 6);
    return { start: startOfDay(base), end: endOfDay(end) };
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last  = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return { start: startOfDay(first), end: endOfDay(last) };
  }
  const y = now.getFullYear() + offset;
  return { start: startOfDay(new Date(y,0,1)), end: endOfDay(new Date(y,11,31)) };
}

export default function Dashboard() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params as { user: any };

  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [walkingProgress, setWalkingProgress] = useState(0);
  const [cyclingProgress, setCyclingProgress] = useState(0);

  const [emissionItems, setEmissionItems] = useState<{ point_value: number; record_date: any }[]>([]);
  const [reductionItems, setReductionItems] = useState<{ point_value: number; record_date: any }[]>([]);
  const [pieLoading, setPieLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CarbonLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardMetric, setLeaderboardMetric] = useState<'carbon' | 'distance'>('carbon');

  /* ----- recent activities ----- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const raw = await fetchRecentActivities(user.user_id);
        const normalized = raw.map((a: any) => {
          const d = parseLocalBkk(a.record_date ?? a.created_at); // ✅ ไม่บวก +7
          return {
            ...a,
            // เก็บ record_date เป็นสตริงดิบไว้ หรือให้เป็น Date local ก็ได้
            // ที่นี่จะเก็บเป็น Date เพื่อใช้ต่อใน hook อื่น ๆ
            record_date: d ?? null,
            distance_km: Number(a.distance_km) || 0,
            type: a.type || 'Activity',
            title: a.title || `${a.type || 'Activity'} on ${d ? d.toLocaleDateString('en-CA') : 'Unknown'}`,
          };
        });
        setActivities(normalized);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    const sum = (t: 'Walking' | 'Cycling') =>
      activities.filter(a => a.type === t).reduce((s, a) => s + (Number(a.distance_km) || 0), 0);

    setWalkingProgress(Math.min((sum('Walking') / (user.walk_goal || 100)) * 100, 100));
    setCyclingProgress(Math.min((sum('Cycling') / (user.bic_goal || 100)) * 100, 100));
  }, [activities, user]);

  /* ----- compute current window & totals ----- */
  const { start, end } = useMemo(() => getRange(period, offset), [period, offset]);

  /* ----- fetch pie lists once ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPieLoading(true);
        const uid = String(user?.user_id ?? user?.id);
        const [ems, reds] = await Promise.all([
          fetchEmissionItems(uid).catch(() => []),
          fetchReductionItems(uid).catch(() => []),
        ]);
        if (!cancelled) {
          setEmissionItems(ems);
          setReductionItems(reds);
        }
      } finally {
        if (!cancelled) setPieLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* ----- fetch leaderboard ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLeaderboardLoading(true);
        const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
        const endStr = end.toISOString().slice(0, 19).replace('T', ' ');
        const items = await fetchCarbonLeaderboard({
          start: startStr,
          end: endStr,
          limit: 10,
          metric: leaderboardMetric,
        });
        if (!cancelled) setLeaderboard(items);
      } catch (err) {
        if (!cancelled) setLeaderboard([]);
        console.warn('⚠️ Failed to load leaderboard', err);
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [start, end, leaderboardMetric]);

  const { emissionSum, reductionSum, totalPie, emPct, redPct } = useMemo(() => {
    const inRange = (v: any) => {
      const d = parseLocalBkk(v); // ✅ ไม่บวก +7
      return d && isValidDate(d) && d >= start && d <= end;
    };

    const eSum = emissionItems.filter(it => inRange(it.record_date))
                              .reduce((s, it) => s + num(it.point_value), 0);
    const rSum = reductionItems.filter(it => inRange(it.record_date))
                               .reduce((s, it) => s + num(it.point_value), 0);
    const tot  = num(eSum) + num(rSum);

    return {
      emissionSum: num(eSum),
      reductionSum: num(rSum),
      totalPie: num(tot),
      emPct: tot > 0 ? (num(eSum) / tot) * 100 : 0,
      redPct: tot > 0 ? (num(rSum) / tot) * 100 : 0,
    };
  }, [emissionItems, reductionItems, start, end]);

  // Rounded for legend labels (2 decimals)
  const emissionRounded = Number(num(emissionSum).toFixed(2));
  const reductionRounded = Number(num(reductionSum).toFixed(2));

  // Force a fresh mount whenever inputs change (fixes the “doesn’t redraw” issue)
  const pieKey = `${period}-${offset}-${emissionRounded}-${reductionRounded}`;

  // Android-safe: if only one slice is 0, give it a tiny epsilon so PieChart renders
  const EPS = 0.0001;
  const hasData = Number.isFinite(totalPie) && totalPie > 0;
  const pieEmission  = emissionRounded  <= 0 ? (hasData ? EPS : 0) : emissionRounded;
  const pieReduction = reductionRounded <= 0 ? (hasData ? EPS : 0) : reductionRounded;

  const { labels, wData, cData, periodTitle } = useDashboardSeries(activities, period, offset);
  const chartConfig = useMemo(() => baseLineChartConfig(period === 'year' ? 0 : 1), [period]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerSide}
              onPress={() => (navigation as any).goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Dashboard</Text>
            <View style={styles.headerSide} />
          </View>

          {/* ---- Line chart ---- */}
          <Text style={styles.sectionTitle}>Walking & Cycling Overviews</Text>

          <View style={styles.card}>
            <View style={styles.periodRow}>
              <SegmentedControl
                items={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]}
                value={period}
                onChange={(p) => { setPeriod(p); setOffset(0); }}
              />
              <NavPeriodButtons
                onPrev={() => setOffset(o => o - 1)}
                onThis={() => setOffset(0)}
                onNext={() => setOffset(o => o + 1)}
              />
            </View>

            <Text style={styles.periodTitle}>{periodTitle}</Text>

            {loading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <View style={styles.cardChartWrap}>
                <LineChart
                  data={{
                    labels,
                    datasets: [
                      { data: wData, color: (o = 1) => `rgba(16,185,129,${o})`, strokeWidth: 2 },
                      { data: cData, color: (o = 1) => `rgba(251,146,60,${o})`, strokeWidth: 2 },
                    ],
                    legend: ['Walking', 'Cycling'],
                  }}
                  width={INNER_WIDTH}
                  height={260}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  bezier
                  fromZero
                  yAxisSuffix=" km"
                />
              </View>
            )}
          </View>

          {/* Progress stats */}
          <View style={styles.progressRow}>
            <ProgressStat label="Walk progress" value={walkingProgress} />
            <ProgressStat label="Cycling progress" value={cyclingProgress} />
          </View>

          {/* ---- Pie ---- */}
          <Text style={styles.sectionTitle}>Emission vs Reduction</Text>

          <View style={styles.card}>
            <View style={styles.periodRow}>
              <SegmentedControl
                items={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]}
                value={period}
                onChange={(p) => { setPeriod(p); setOffset(0); }}
              />
              <NavPeriodButtons
                onPrev={() => setOffset(o => o - 1)}
                onThis={() => setOffset(0)}
                onNext={() => setOffset(o => o + 1)}
              />
            </View>

            <Text style={styles.periodTitle}>{periodTitle}</Text>

            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Emission</Text>
              <Text style={styles.kvValue}>{pctText(emPct)}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Reduction</Text>
              <Text style={[styles.kvValue, styles.kvGreen]}>{pctText(redPct)}</Text>
            </View>

            {pieLoading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : !hasData ? (
              <View style={styles.emptyWrap}>
                <Text style={{ color: theme.sub, textAlign: 'center' }}>
                  No emission or reduction data for {periodTitle}.
                </Text>
              </View>
            ) : (
              <View style={styles.cardChartWrap}>
                <PieChart
                  key={pieKey}
                  data={[
                    {
                      name: 'Emission',
                      population: Math.max(0.0001, pieEmission),
                      color: PIE_COLORS.emission,
                      legendFontColor: PIE_COLORS.emissionLegend,
                      legendFontSize: 14,
                    },
                    {
                      name: 'Reduction',
                      population: Math.max(0.0001, pieReduction),
                      color: PIE_COLORS.reduction,
                      legendFontColor: PIE_COLORS.reductionLegend,
                      legendFontSize: 14,
                    },
                  ]}
                  width={INNER_WIDTH}
                  height={230}
                  chartConfig={{
                    backgroundColor: '#fff',
                    color: (o = 1) => `rgba(0,0,0,${o})`,
                    labelColor: () => theme.text,
                    decimalPlaces: 1,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  absolute
                />
              </View>
            )}
          </View>

          {/* ---- Carbon reduction leaderboard ---- */}
            <View style={styles.card}>
              <View style={styles.leaderboardHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Carbon Reduction Leaderboard</Text>
                  <Text style={styles.leaderboardSub}>Top movers this {period} - Walk + Bike combined</Text>
                </View>
                {leaderboardLoading && <ActivityIndicator color={theme.primary} />}
              </View>

            <View style={styles.leaderboardControls}>
              <SegmentedControl
                items={[
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                  { value: 'year', label: 'Year' },
                ]}
                value={period}
                onChange={(p) => { setPeriod(p); setOffset(0); }}
                style={{ flex: 1 }}
              />
              <NavPeriodButtons
                onPrev={() => setOffset((o) => o - 1)}
                onThis={() => setOffset(0)}
                onNext={() => setOffset((o) => o + 1)}
              />
            </View>

            <View style={[styles.leaderboardControls, { marginTop: 8 }]}>
              <SegmentedControl
                items={[
                  { value: 'carbon', label: 'Carbon' },
                  { value: 'distance', label: 'Distance' },
                ]}
                value={leaderboardMetric}
                onChange={(val) => setLeaderboardMetric(val as any)}
                style={{ alignSelf: 'flex-start' }}
              />
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableUser]}>User</Text>
              <Text style={[styles.tableCell, styles.tableValue]}>
                {leaderboardMetric === 'distance' ? 'Distance (km)' : 'Carbon (kg)'}
              </Text>
            </View>
            {leaderboard.map((entry, idx) => (
              <View
                key={`${entry.user_id}-${idx}`}
                style={[
                  styles.tableRow,
                  idx === 0 && styles.rowGold,
                  idx === 1 && styles.rowSilver,
                  idx === 2 && styles.rowBronze,
                ]}
              >
                <View style={[styles.rankBadge, idx === 0 && styles.rankGold, idx === 1 && styles.rankSilver, idx === 2 && styles.rankBronze]}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={styles.userBlock}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {entry.name || `User #${entry.user_id ?? '-'}`}
                  </Text>
                  <Text style={styles.userMeta} numberOfLines={1}>
                    {leaderboardMetric === 'distance' ? 'Active distance' : 'Carbon saved'}
                  </Text>
                </View>
                <View style={styles.valuePill}>
                  <Text style={styles.valueText}>
                    {Number(entry.value || 0).toFixed(2)} {leaderboardMetric === 'distance' ? 'km' : 'kg'}
                  </Text>
                </View>
              </View>
            ))}
            {(!leaderboard || leaderboard.length === 0) && !leaderboardLoading && (
              <View style={styles.emptyLeaderboard}>
                <Ionicons name="leaf-outline" size={18} color={theme.sub} />
                <Text style={styles.emptyLeaderboardText}>No carbon reduction data yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SCREEN_PAD, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerSide: { width: 28, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 16, marginBottom: 8 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: CARD_HPAD,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodTitle: { color: theme.sub, marginTop: 8, fontWeight: '700' },

  cardChartWrap: { marginTop: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', alignSelf: 'center' },
  chart: { alignSelf: 'stretch' },

  progressRow: { flexDirection: 'row', gap: 12, marginTop: 12 },

  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leaderboardSub: { color: theme.sub, fontSize: 12 },
  leaderboardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 44,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: '#F8FAFC',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  tableCell: { color: theme.text },
  tableUser: { flex: 1, paddingHorizontal: 8, fontWeight: '700' },
  tableValue: { width: 120, textAlign: 'right', fontWeight: '700', color: theme.text },
  rowGold: { backgroundColor: '#ECFDF3', borderLeftWidth: 3, borderLeftColor: theme.primary },
  rowSilver: { backgroundColor: '#F4F6FB' },
  rowBronze: { backgroundColor: '#FFF7ED' },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FFF3',
    borderWidth: 1,
    borderColor: theme.primary,
    marginRight: 10,
  },
  rankGold: { backgroundColor: theme.primary },
  rankSilver: { backgroundColor: '#E5E7EB', borderColor: '#CBD5E1' },
  rankBronze: { backgroundColor: '#FFEEDA', borderColor: '#FBBF24' },
  rankText: { fontWeight: '800', color: '#0B1721' },
  userBlock: { flex: 1, paddingRight: 8 },
  userName: { fontWeight: '700', color: theme.text },
  userMeta: { color: theme.sub, fontSize: 12, marginTop: 2 },
  valuePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E8FFF3',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  valueText: { color: theme.primaryDark, fontWeight: '800' },
  emptyLeaderboard: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLeaderboardText: { color: theme.sub, marginTop: 6 },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  kvLabel: { color: theme.sub, fontSize: 14 },
  kvValue: { color: theme.text, fontSize: 16, fontWeight: '800' },
  kvGreen: { color: theme.primary },

  emptyWrap: {
    height: 130,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
});
