import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ReductionRow } from '../types/calc';
import { formatDateTime } from '../utils/format';

const theme = {
  primaryDark: '#059669',
  sub: '#6B7280',
  text: '#0B1721',
  border: '#E5E7EB',
};

type Props = { item: ReductionRow };

export default function ReductionCard({ item }: Props) {
  const dateStr = formatDateTime(item.create_at);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {item.activity_from} → {item.activity_to}
      </Text>
      {(item.param_from || item.param_to) ? (
        <Text style={styles.line}>
          {item.param_from ?? '—'} → {item.param_to ?? '—'}
        </Text>
      ) : null}
      {Number(item.distance_km) > 0 && (
        <Text style={styles.line}>
          Distance: <Text style={styles.strong}>{Number(item.distance_km).toFixed(2)} km</Text>
        </Text>
      )}
      <Text style={styles.line}>
        Saved: <Text style={styles.strong}>{Number(item.point_value).toFixed(2)} kgCO₂e</Text>
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
  title: { fontWeight: '800', color: theme.text, marginBottom: 6 },
  line: { color: theme.sub, marginTop: 2, fontSize: 12 },
  strong: { color: theme.primaryDark, fontWeight: '800' },
  date: { color: theme.sub, fontSize: 11, marginTop: 6 },
});
