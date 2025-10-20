// src/components/RecentActivityList.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ActivityType = 'Cycling' | 'Walking';
export type Activity = {
  type: ActivityType;
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date | number;
  id?: string | number;
};

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
  if (typeof input === 'number') return new Date(input < 1e11 ? input * 1000 : input);
  if (typeof input === 'string') {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) return new Date(s.replace(' ', 'T'));
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

type Props = {
  title?: string;
  activities: Activity[];
  loading?: boolean;
  onItemPress?: (activity: Activity) => void;
};

const RecentActivityList: React.FC<Props> = ({ title = 'Recent Activity', activities, loading, onItemPress }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>

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
          const iconName = activity.type === 'Cycling' ? 'bicycle-outline' : 'walk-outline';
          return (
            <TouchableOpacity
              key={`${activity.type}-${activity.id ?? idx}-${activity.record_date ?? idx}`}
              style={styles.recentItem}
              activeOpacity={0.9}
              onPress={() => onItemPress?.(activity)}
            >
              <View style={styles.recentIcon}>
                <Ionicons name={iconName as any} size={18} color={theme.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle}>{activity.title || activity.type}</Text>
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
  );
};

export default RecentActivityList;

const styles = StyleSheet.create({
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },

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
