// src/screens/RecentAct.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeStack';
import type { ActivityPayload } from '../types/activity'; // ✅ ใช้ชนิดกลาง

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
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDate(dt?: string | Date) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

const RecentAct: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const activity: ActivityPayload | undefined = route?.params?.activity;

  const title = activity?.title || activity?.type || 'Activity';
  const description = activity?.description || '—';
  const distanceKm = fmtNumber(activity?.distance_km, 2);
  const steps = typeof activity?.step_total === 'number' ? activity.step_total.toLocaleString() : '—';
  const duration = fmtDuration(activity?.duration_sec);
  const recordDate = fmtDate(activity?.record_date ?? activity?.created_at);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{recordDate}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.valueRight}>{description}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>{distanceKm} km</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Steps</Text>
            <Text style={styles.value}>{steps}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{duration}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.chip, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, color: theme.text, marginRight: 36,
  },
  container: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: theme.text },
  subtitle: { marginTop: 4, color: theme.sub },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', paddingVertical: 8 },
  label: { color: theme.sub },
  value: { color: theme.text, fontWeight: '700' },
  valueRight: { color: theme.text, textAlign: 'right', flex: 1 },
});

export default RecentAct;
