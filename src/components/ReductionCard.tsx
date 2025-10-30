import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ReductionRow } from '../types/calc';
import { formatDateTime } from '../utils/format';

const theme = {
  primaryDark: '#059669',
  sub: '#6B7280',
  text: '#0B1721',
  border: '#E5E7EB',
  danger: '#DC2626',
};

type Props = {
  item: ReductionRow;
  onRemove?: (item: ReductionRow) => void;
};

export default function ReductionCard({ item, onRemove }: Props) {
  const dateStr = formatDateTime(item.create_at);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {item.activity_from} -> {item.activity_to}
        </Text>
        {onRemove ? (
          <TouchableOpacity
            onPress={() => onRemove(item)}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Remove reduction activity"
          >
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </TouchableOpacity>
        ) : null}
      </View>

      {(item.param_from || item.param_to) ? (
        <Text style={styles.line}>
          {(item.param_from ?? '-')} -> {(item.param_to ?? '-')}
        </Text>
      ) : null}

      {Number(item.distance_km) > 0 && (
        <Text style={styles.line}>
          Distance: <Text style={styles.strong}>{Number(item.distance_km).toFixed(2)} km</Text>
        </Text>
      )}

      <Text style={styles.line}>
        Saved: <Text style={styles.strong}>{Number(item.point_value).toFixed(2)} kgCO2e</Text>
      </Text>

      {!!dateStr && <Text style={styles.date}>{dateStr}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
    marginRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { fontWeight: '800', color: theme.text, flex: 1 },
  deleteBtn: { padding: 4, borderRadius: 16 },
  line: { color: theme.sub, marginTop: 6, fontSize: 12 },
  strong: { color: theme.primaryDark, fontWeight: '800' },
  date: { color: theme.sub, fontSize: 11, marginTop: 8 },
});
