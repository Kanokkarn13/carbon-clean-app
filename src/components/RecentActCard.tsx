import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
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
  chipBorder: '#D1FAE5',
};

// Palette used per activity type
const PALETTE = {
  yellow: '#FACC15',
  yellowLight: '#FEF9C3',
  blue: "#3B82F6",
  bg: "#F6FAF8",
};

const TYPE_COLORS: Record<ActivityType, { color: string; tint: string; icon: any }> = {
  Walking: { color: PALETTE.yellow, tint: PALETTE.yellowLight, icon: 'walk' },
  Cycling: { color: PALETTE.blue, tint: PALETTE.bg, icon: 'bicycle' },
};

export type RecentActCardProps = {
  activity: Activity;
  onPress?: (a: Activity) => void;
  containerStyle?: ViewStyle;
};

const fmtDistance = (km?: number) => {
  const v = Number(km ?? 0);
  if (!isFinite(v) || v <= 0) return '0 m';
  const meters = Math.round(v * 1000);
  if (meters < 1000) return `${meters} m`;
  const kmPart = Math.floor(meters / 1000);
  const mPart = meters % 1000;
  return mPart ? `${kmPart} km ${mPart} m` : `${kmPart} km`;
};

/** Parse as *local wall time* (no unwanted UTC shift). */
const parseLocalLike = (input?: string | number | Date) => {
  if (!input) return undefined as Date | undefined;
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // 10-digit seconds vs 13-digit ms
    return new Date(input < 1e11 ? input * 1000 : input);
  }

  let s = String(input).trim();

  // If ends with Z (UTC), strip it so JS treats it as local wall time
  if (/[zZ]$/.test(s)) s = s.slice(0, -1);

  // Normalize "YYYY-MM-DD HH:mm(:ss)" → "YYYY-MM-DDTHH:mm(:ss)"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T');
  }

  return new Date(s);
};

const fmtWhen = (dateLike?: string | number | Date) => {
  const d = parseLocalLike(dateLike);
  if (!d || isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  if (days <= 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function RecentActCard({ activity, onPress, containerStyle }: RecentActCardProps) {
  const tc = TYPE_COLORS[activity.type] ?? { color: theme.sub, tint: '#F3F4F6', icon: 'walk' };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(activity)}
      style={[styles.row, containerStyle]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tc.tint, borderColor: tc.tint }]}>
        <Ionicons name={tc.icon} size={18} color={tc.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.title || activity.type}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          <Text style={{ color: tc.color, fontWeight: '700' }}>{fmtDistance(activity.distance_km)}</Text>
          <Text> · {fmtWhen(activity.record_date)}</Text>
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.sub} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontWeight: '700', color: theme.text },
  sub: { color: theme.sub, marginTop: 2 },
});
