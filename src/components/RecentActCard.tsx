// src/components/RecentActCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
};

export default function RecentActCard({ item, onPress }: any) {
  const { title, distance_km, carbonReduce, type } = item;
  const color = type === 'Cycling' ? '#FB923C' : '#FACC15';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title || type}
        </Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{type}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="leaf" size={14} color={theme.primaryDark} />
          <Text style={styles.statText}>
            {carbonReduce?.toFixed?.(2) ?? 0} kg CO₂
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="walk" size={14} color={theme.primaryDark} />
          <Text style={styles.statText}>{distance_km?.toFixed?.(2) ?? 0} km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    margin: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 14, color: theme.text, flex: 1, marginRight: 8 },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#000', fontWeight: '700', fontSize: 10 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: theme.sub, fontSize: 12 },
});
