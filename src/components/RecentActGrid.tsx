import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import RecentActCard, { Activity } from './RecentActCard';
import { Ionicons } from '@expo/vector-icons';

export type RecentActGridProps = {
  title?: string;
  activities: Activity[];
  loading?: boolean;
  onItemPress?: (a: Activity) => void;
  columns?: number; // default 2
};

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
};

export default function RecentActGrid({
  title = 'Recent Activity',
  activities,
  loading,
  onItemPress,
  columns = 2,
}: RecentActGridProps) {
  const col = Math.max(1, Math.floor(columns));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="leaf-outline" size={18} color={theme.sub} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      ) : (
        <View style={[styles.grid, { columnGap: 10, rowGap: 10 }]}>
          {activities.map((a, i) => {
            const key = `${a.id ?? 'na'}-${a.record_date ?? 'none'}-${a.title ?? 'untitled'}-${i}`;
            return (
              <View key={key} style={{ flexBasis: `${100 / col}%`, maxWidth: `${100 / col}%` }}>
                <RecentActCard activity={a} onPress={onItemPress} />
              </View>
            );
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

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
