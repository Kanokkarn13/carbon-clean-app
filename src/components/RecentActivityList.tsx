import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RecentActCard, { Activity } from './RecentActCard';

export type ActivityType = 'Cycling' | 'Walking';

type Props = {
  title?: string;
  activities: Activity[] | undefined | null;
  loading?: boolean;
  onItemPress?: (a: Activity) => void;
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

export default function RecentActivityList({
  title = 'Recent Activity',
  activities,
  loading,
  onItemPress,
}: Props) {
  const list = Array.isArray(activities) ? activities : [];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="leaf-outline" size={18} color={theme.sub} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((a, i) => {
            // Stable composite key
            const id = a.id ?? 'na';
            const dt = a.record_date ?? 'none';
            const ttl = a.title ?? 'untitled';
            const key = `${id}-${dt}-${ttl}-${i}`;
            return <RecentActCard key={key} activity={a} onPress={onItemPress} />;
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },

  loadingBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  loadingText: { color: theme.sub },

  emptyBox: { paddingVertical: 16, alignItems: 'center', gap: 6 },
  emptyText: { color: theme.sub },
});
