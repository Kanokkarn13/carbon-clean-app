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

const screenWidth = Dimensions.get('window').width;

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  orange: '#FB923C',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

type Period = 'week' | 'month' | 'year';

const isValidDate = (d: any) => d instanceof Date && !Number.isNaN(d.getTime());
const safeDate = (v: any) => {
  const d = new Date(v);
  return isValidDate(d) ? d : null;
};
function startOfDay(d?: Date | null) {
  if (!d || !isValidDate(d)) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function iso(d?: Date | null) {
  const s = startOfDay(d);
  return s ? s.toISOString().slice(0, 10) : '';
}

export default function Dashboard() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params as { user: any };

  // UI / data state
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0); // 0 = current period, -1 = previous, +1 = next
  const [walkingProgress, setWalkingProgress] = useState<number>(0);
  const [cyclingProgress, setCyclingProgress] = useState<number>(0);
  const [emissionData, setEmissionData] = useState<number>(70);
  const [reductionData, setReductionData] = useState<number>(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://192.168.0.102:3000/api/recent-activity/${user.user_id}`);
        const json = await res.json();
        const arr = Array.isArray(json.activities) ? json.activities : [];

        // ✅ นอร์มัลไลซ์: ใช้ record_date เสมอ, กัน distance เป็นสตริง/NaN
        const normalized = arr.map((a: any) => {
          const rdRaw = a.record_date ?? a.created_at ?? null; // เผื่อ API รุ่นเก่า
          const d = safeDate(rdRaw);
          return {
            ...a,
            record_date: d ? d.toISOString() : null,
            distance_km:
              typeof a.distance_km === 'number'
                ? a.distance_km
                : Number(a.distance_km) || 0,
            type: a.type || 'Activity',
            title:
              (a.title && String(a.title).trim()) ||
              `${a.type || 'Activity'} on ${d ? d.toISOString().slice(0, 10) : 'Unknown'}`,
          };
        });

        setActivities(normalized);
      } catch (e) {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const { labels, wData, cData } = useMemo(() => {
    const now = new Date();
    let rangeLabels: string[] = [];
    let dateKeys: string[] = [];

    if (period === 'week') {
      const base = startOfDay(now)!;
      const day = (base.getDay() + 6) % 7; // Mon=0..Sun=6
      base.setDate(base.getDate() - day + offset * 7);

      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        rangeLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2));
        dateKeys.push(iso(d));
      }

      // init daily buckets
      const buckets: Record<string, { walking: number; cycling: number }> = {};
      dateKeys.forEach((k) => (buckets[k] = { walking: 0, cycling: 0 }));

      activities.forEach((a) => {
        const d = safeDate(a.record_date);
        const key = iso(d);
        if (!key || !buckets[key]) return;
        const dist = Number.isFinite(a.distance_km) ? Math.max(0, a.distance_km) : 0;
        if (a.type === 'Walking') buckets[key].walking += dist;
        if (a.type === 'Cycling') buckets[key].cycling += dist;
      });

      return {
        labels: rangeLabels,
        wData: dateKeys.map((k) => buckets[k].walking),
        cData: dateKeys.map((k) => buckets[k].cycling),
      };
    }

    if (period === 'month') {
      // Aggregate เดือนเป็น bin รายสัปดาห์ (W1–W5)
      const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const binCount = Math.ceil(daysInMonth / 7); // 4–5 bins
      rangeLabels = Array.from({ length: binCount }, (_, i) => `W${i + 1}`);

      const weekBuckets = Array.from({ length: binCount }, () => ({ walking: 0, cycling: 0 }));

      activities.forEach((a) => {
        const d = safeDate(a.record_date);
        if (!d) return;
        const sameMonth = d.getFullYear() === base.getFullYear() && d.getMonth() === base.getMonth();
        if (!sameMonth) return;

        const day = d.getDate(); // 1..daysInMonth
        const weekIdx = Math.min(Math.floor((day - 1) / 7), binCount - 1);
        const dist = Number.isFinite(a.distance_km) ? Math.max(0, a.distance_km) : 0;
        if (a.type === 'Walking') weekBuckets[weekIdx].walking += dist;
        if (a.type === 'Cycling') weekBuckets[weekIdx].cycling += dist;
      });

      return {
        labels: rangeLabels,
        wData: weekBuckets.map((b) => b.walking),
        cData: weekBuckets.map((b) => b.cycling),
      };
    }

    // year
    const year = now.getFullYear() + offset;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    rangeLabels = monthNames.slice();
    const buckets: Record<number, { walking: number; cycling: number }> = {};
    monthNames.forEach((_, i) => (buckets[i] = { walking: 0, cycling: 0 }));

    activities.forEach((a) => {
      const d = safeDate(a.record_date);
      if (!d || d.getFullYear() !== year) return;
      const m = d.getMonth();
      const dist = Number.isFinite(a.distance_km) ? Math.max(0, a.distance_km) : 0;
      if (a.type === 'Walking') buckets[m].walking += dist;
      if (a.type === 'Cycling') buckets[m].cycling += dist;
    });

    return {
      labels: rangeLabels,
      wData: monthNames.map((_, i) => buckets[i].walking),
      cData: monthNames.map((_, i) => buckets[i].cycling),
    };
  }, [activities, period, offset]);

  // overall progress (not tied to selected range)
  useEffect(() => {
    const totalWalking = activities
      .filter((a) => a.type === 'Walking')
      .reduce((s, a) => s + (Number.isFinite(a.distance_km) ? Math.max(0, a.distance_km) : 0), 0);
    const totalCycling = activities
      .filter((a) => a.type === 'Cycling')
      .reduce((s, a) => s + (Number.isFinite(a.distance_km) ? Math.max(0, a.distance_km) : 0), 0);

    const walkingPct = Math.min((totalWalking / (user.walk_goal || 100)) * 100, 100);
    const cyclingPct = Math.min((totalCycling / (user.bic_goal || 100)) * 100, 100);
    setWalkingProgress(walkingPct);
    setCyclingProgress(cyclingPct);
  }, [activities, user]);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: period === 'year' ? 0 : 1,
    color: (o = 1) => `rgba(16,185,129,${o})`,
    labelColor: () => theme.sub,
    propsForDots: { r: '3.5', strokeWidth: '2' },
    propsForBackgroundLines: { strokeDasharray: '' },
  };

  // period title text
  const periodTitle = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const base = startOfDay(now)!;
      const day = (base.getDay() + 6) % 7;
      base.setDate(base.getDate() - day + offset * 7);
      const end = new Date(base);
      end.setDate(base.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(base)} – ${fmt(end)}`;
    }
    if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const y = now.getFullYear() + offset;
    return String(y);
  }, [period, offset]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header — centered title, no overlap */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerSide}
              onPress={() => (navigation as any).goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Dashboard</Text>
            <View style={styles.headerSide} />{/* spacer keeps title centered */}
          </View>

          {/* Period selector */}
          <View style={styles.card}>
            <View style={styles.periodRow}>
              <View style={styles.segment}>
                {(['week', 'month', 'year'] as Period[]).map((p) => {
                  const active = p === period;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setPeriod(p);
                        setOffset(0);
                      }}
                      style={[styles.segBtn, active && styles.segBtnActive]}
                    >
                      <Text style={[styles.segText, active && styles.segTextActive]}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.navBtns}>
                <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={18} color={theme.primaryDark} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOffset(0)} style={[styles.navBtn, { marginHorizontal: 4 }]}>
                  <Text style={{ color: theme.primaryDark, fontWeight: '700' }}>This</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOffset((o) => o + 1)} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={18} color={theme.primaryDark} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.periodTitle}>{periodTitle}</Text>

            {loading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <LineChart
                data={{
                  labels,
                  datasets: [
                    { data: wData, color: (o = 1) => `rgba(16,185,129,${o})`, strokeWidth: 2 }, // Walking
                    { data: cData, color: (o = 1) => `rgba(251,146,60,${o})`, strokeWidth: 2 }, // Cycling
                  ],
                  legend: ['Walking', 'Cycling'],
                }}
                width={screenWidth - 32}
                height={260}
                chartConfig={chartConfig}
                style={styles.chart}
                bezier
                fromZero
              />
            )}
          </View>

          {/* Overall progress (not tied to selected period) */}
          <View style={styles.progressRow}>
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Walk progress</Text>
              <Text style={styles.progressValue}>{walkingProgress.toFixed(1)}%</Text>
            </View>
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Cycling progress</Text>
              <Text style={styles.progressValue}>{cyclingProgress.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Pie */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emission vs Reduction</Text>
            <PieChart
              data={[
                { name: 'Emission', population: Math.max(0.1, emissionData), color: '#9CA3AF', legendFontColor: '#6B7280', legendFontSize: 14 },
                { name: 'Reduction', population: Math.max(0.1, reductionData), color: theme.primary, legendFontColor: '#6B7280', legendFontSize: 14 },
              ]}
              width={screenWidth - 32}
              height={230}
              chartConfig={{ backgroundColor: '#fff', color: (o = 1) => `rgba(0,0,0,${o})`, labelColor: () => '#000' }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerSide: { width: 28, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { fontWeight: '700', color: theme.text, marginBottom: 10, fontSize: 16 },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 4,
  },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  segBtnActive: { backgroundColor: theme.primary },
  segText: { color: theme.primaryDark, fontWeight: '700' },
  segTextActive: { color: '#FFF' },

  navBtns: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFF' },
  periodTitle: { color: theme.sub, marginTop: 8, fontWeight: '700' },

  chart: { borderRadius: 12, marginTop: 8 },

  progressRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  progressCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    alignItems: 'center',
  },
  progressLabel: { color: theme.sub, fontWeight: '700' },
  progressValue: { color: theme.text, fontWeight: '800', fontSize: 20, marginTop: 6 },
});
