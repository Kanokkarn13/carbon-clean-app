// src/screens/RecentAct.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeStack';
import type { ActivityPayload } from '../types/activity';
import { evaluateActivityPoints } from '../utils/points';

let MapView: any = null;
try { MapView = require('react-native-maps').default; } catch {}

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecentAct'>;

const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
const API_BASE = RAW_BASE.replace(/\/+$/, '');
const api = (p: string) => `${API_BASE}/api${p}`;

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#F8FAFC',
  chipBorder: '#E8EEF3',
  muted: '#F3F4F6',
};

// === brand colors for icons/values ===
const COLORS = {
  green: '#22C55E',  // carbon
  blue:  '#3B82F6',  // distance
  teal:  '#14B8A6',  // duration
  yellow:'#F59E0B',  // steps
};
const TINTS = {
  green: '#ECFDF5',
  blue:  '#EFF6FF',
  teal:  '#ECFEFF',
  yellow:'#FFFBEB',
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
  return h ? `${h}:${`${m}`.padStart(2,'0')}:${`${s}`.padStart(2,'0')}` : `${m}:${`${s}`.padStart(2,'0')}`;
}

/** ---------- DATE SAFE HELPERS (no UTC shift, force Gregorian) ---------- */
const parseLocalLike = (input?: string | number | Date) => {
  if (!input) return undefined as Date | undefined;
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // 10-digit seconds vs 13-digit ms
    return new Date(input < 1e11 ? input * 1000 : input);
  }

  let s = String(input).trim();
  // Strip trailing Z (UTC), we want to treat as local wall time
  if (/[zZ]$/.test(s)) s = s.slice(0, -1);
  // Normalize "YYYY-MM-DD HH:mm(:ss)" → "YYYY-MM-DDTHH:mm(:ss)"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T');
  }
  return new Date(s);
};

function fmtDateParts(dt?: string | number | Date) {
  const d = parseLocalLike(dt);
  if (!d || isNaN(d.getTime())) return { date: '—', time: '' };

  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear(); // Gregorian (no BE)

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  return { date: `${dd} ${mon} ${yyyy}`, time: `${hh}:${mm}` };
}
/** ---------------------------------------------------------------------- */

function toNum(v: unknown): number | undefined { const n = Number(v); return Number.isFinite(n) ? n : undefined; }

const RecentAct: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const params = (route?.params ?? {}) as Record<string, unknown>;
  const activity: ActivityPayload | undefined = params.activity as any;

  const typeLabel = (activity as any)?.type || 'Activity';
  const isCycling = String(typeLabel).toLowerCase().includes('cycl');
  const typeSlug = isCycling ? 'cycling' : 'walking';

  const id = (activity as any)?.id;
  const title0 = activity?.title || (activity as any)?.type || 'Title';
  const description0 = activity?.description || '';

  const distanceKm = typeof activity?.distance_km === 'number' ? activity.distance_km : toNum((activity as any)?.distance_km);
  const stepTotalNum = typeof activity?.step_total === 'number' ? activity.step_total : toNum((activity as any)?.step_total);
  const steps = stepTotalNum != null ? stepTotalNum.toLocaleString() : undefined;
  const durationSecRaw =
    typeof activity?.duration_sec === 'number'
      ? activity.duration_sec
      : toNum((activity as any)?.duration_sec);
  const duration = fmtDuration(durationSecRaw);
  const { date: recordDate, time: recordTime } = fmtDateParts((activity as any)?.record_date ?? (activity as any)?.created_at);

  const carbonReduceKgTop = toNum(params.carbonReduce);
  const carbonReduceKgAct = toNum((activity as any)?.carbonReduce) ?? toNum((activity as any)?.carbon_reduce_kg);
  const carbonReduceGAct = toNum((activity as any)?.carbon_reduce_g);
  const carbonKg = carbonReduceKgTop ?? carbonReduceKgAct ?? (carbonReduceGAct != null ? carbonReduceGAct / 1000 : undefined);
  const carbonG = carbonKg != null ? Math.round(carbonKg * 1000) : carbonReduceGAct;

  const rawPoints = typeof (activity as any)?.points === 'number' ? (activity as any).points : undefined;
  const evaluation = evaluateActivityPoints(
    {
      points: rawPoints,
      point_value: rawPoints,
      duration_sec: durationSecRaw,
      distance_km: distanceKm,
      step_total: stepTotalNum,
      type: typeLabel,
      activity: (activity as any)?.activity ?? (activity as any)?.activity_type ?? typeLabel,
    },
    durationSecRaw,
  );
  const points = evaluation.points;
  const pointsDisplay = Math.round(points).toLocaleString();
  const reasonText = (() => {
    const code = (evaluation.reason || '').toLowerCase();
    if (!code) return null;
    if (code === 'speed-out-of-range') {
      return isCycling ? 'Speed must stay between 3-30 km/h.' : 'Speed must stay between 3-15 km/h.';
    }
    if (code === 'step-rate-out-of-range') return 'Steps must stay between 0.2 and 200 per minute.';
    if (code === 'no-duration') return 'Duration is required to validate points.';
    if (code === 'no-distance') return 'Distance is required to validate points.';
    if (code === 'no-steps') return 'Step count is required to validate points.';
    if (code === 'missing-data') return 'Not enough data to validate this activity.';
    return 'This activity does not meet the point criteria.';
  })();
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    if (!showReason) return;
    const timer = setTimeout(() => setShowReason(false), 5000);
    return () => clearTimeout(timer);
  }, [showReason]);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(title0);
  const [editDesc, setEditDesc] = useState(description0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => { setEditTitle(title0); setEditDesc(description0); }, [title0, description0]);

  const endpointBase = useMemo(() => api(`/${typeSlug}`), [typeSlug]);

  const doPatch = async () => {
    if (!id) return Alert.alert('Missing id', 'This activity has no id.');
    try {
      setSaving(true);
      const res = await fetch(`${endpointBase}/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      const text = await res.text();
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? JSON.parse(text) : { message: text };
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      Alert.alert('Updated', 'Activity updated.');
      setShowEdit(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!id) return Alert.alert('Missing id', 'This activity has no id.');
    Alert.alert('Delete activity', 'This action cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            const res = await fetch(`${endpointBase}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
            const text = await res.text();
            const isJson = (res.headers.get('content-type') || '').includes('application/json');
            const data = isJson ? JSON.parse(text) : { message: text };
            if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
            Alert.alert('Deleted', 'Activity removed.');
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Unknown error');
          } finally {
            setDeleting(false);
          }
        },
      },
    ], { cancelable: true });
  };

  // ======= SQUARE ROW SIZE (all boxes same row) =======
  const screenW = Dimensions.get('window').width;
  const PAD_H = 16;       // horizontal padding of grid
  const GAP = 10;         // gap between squares
  const COUNT = isCycling ? 3 : 4;
  const innerW = screenW - PAD_H * 2 - GAP * (COUNT - 1);
  const BOX = Math.max(64, Math.floor(innerW / COUNT)); // min 64px

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapWrap}>
          {MapView ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{ latitude: 13.7563, longitude: 100.5018, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
              pointerEvents="none"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
              <Ionicons name="map" size={28} color={theme.sub} />
              <Text style={{ color: theme.sub, marginTop: 6 }}>Map preview</Text>
            </View>
          )}
          <View style={styles.mapTabs}>
            <View style={[styles.mapTab, styles.mapTabActive]}><Text style={styles.mapTabTextActive}>Map</Text></View>
            <View style={styles.mapTab}><Text style={styles.mapTabText}>Satellite</Text></View>
          </View>
        </View>

        {/* Main card */}
        <View style={styles.card}>
          <View style={styles.titleLine}>
            <Text style={styles.labelBold}>Title:</Text>
            <Text style={styles.linkTitle} numberOfLines={2}>{title0 || '—'}</Text>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{description0 || ' '}</Text>
          </View>

          {/* date/time + points */}
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateMain}>{recordDate}</Text>
              {recordTime ? <Text style={styles.timeSub}>{recordTime}</Text> : null}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.pointLabel}>Point Received</Text>
              <View style={styles.pointRow}>
                <View style={styles.pointChip}>
                  <Text style={styles.pointChipText}>{pointsDisplay} P</Text>
                </View>
                {!evaluation.valid && reasonText && (
                  <TouchableOpacity
                    style={styles.pointInfoBtn}
                    onPress={() => setShowReason(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Point validation info"
                  >
                    <Ionicons name="information-circle-outline" size={20} color={theme.sub} />
                  </TouchableOpacity>
                )}
              </View>
              {!evaluation.valid && showReason && reasonText && (
                <View style={styles.reasonBanner}>
                  <Text style={styles.reasonText}>{reasonText}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Squares — all in one row (with colored icons & values) */}
        <View style={[styles.squareRow, { paddingHorizontal: PAD_H }]}>
          <StatSquare
            size={BOX} icon="leaf" label="carbon reduce"
            value={`${fmtNumber(carbonG, 0)} g`} color={COLORS.green} tint={TINTS.green}
          />
          <StatSquare
            size={BOX} icon="location" label="distance"
            value={`${fmtNumber(distanceKm, 2)} km`} color={COLORS.blue} tint={TINTS.blue}
          />
          <StatSquare
            size={BOX} icon="time-outline" label="duration"
            value={duration} color={COLORS.teal} tint={TINTS.teal}
          />
          {!isCycling && (
            <StatSquare
              size={BOX} icon="walk-outline" label="steps"
              value={steps ?? '—'} color={COLORS.yellow} tint={TINTS.yellow}
            />
          )}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionGhost]} onPress={() => setShowEdit(true)}>
          <Ionicons name="pencil" size={16} color={theme.primaryDark} />
          <Text style={[styles.actionText, { color: theme.primaryDark }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDanger, deleting && { opacity: 0.6 }]}
          onPress={doDelete}
          disabled={deleting}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>{deleting ? 'Deleting…' : 'Delete'}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Activity</Text>
                <TouchableOpacity onPress={() => setShowEdit(false)}>
                  <Ionicons name="close" size={22} color={theme.sub} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title"
                placeholderTextColor={theme.sub}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Description</Text>
              <TextInput
                style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Description"
                placeholderTextColor={theme.sub}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowEdit(false)}>
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary, saving && { opacity: 0.6 }]}
                  onPress={doPatch}
                  disabled={saving}
                >
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.modalBtnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

function StatSquare({
  size, icon, label, value, color, tint,
}: {
  size: number;
  icon: any;
  label: string;
  value: string;
  color: string;
  tint: string;
}) {
  return (
    <View style={[styles.square, { width: size, height: size }]}>
      <View style={[styles.squareIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.squareValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.squareLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const RADIUS = 10;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, backgroundColor: theme.bg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 18, color: theme.text, marginRight: 36 },

  mapWrap: { height: 210, marginHorizontal: 16, marginBottom: 12, borderRadius: RADIUS, overflow: 'hidden', backgroundColor: theme.muted, borderWidth: 1, borderColor: theme.border },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mapTabs: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', padding: 3, borderRadius: 8 },
  mapTab: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  mapTabActive: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  mapTabText: { color: theme.sub, fontSize: 12, fontWeight: '600' },
  mapTabTextActive: { color: theme.text, fontSize: 12, fontWeight: '700' },

  card: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: RADIUS, padding: 14, borderWidth: 1, borderColor: theme.border },

  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  labelBold: { color: theme.text, fontWeight: '800', fontSize: 16 },
  linkTitle: { color: theme.primaryDark, fontWeight: '800', fontSize: 16, flex: 1, flexShrink: 1 },

  label: { color: theme.sub, fontSize: 12, fontWeight: '700' },
  descBox: { marginTop: 6, minHeight: 64, backgroundColor: theme.chip, borderRadius: 10, borderWidth: 1, borderColor: theme.chipBorder, padding: 12 },
  descText: { color: theme.text, fontSize: 14 },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  dateMain: { color: theme.text, fontSize: 15, fontWeight: '700' },
  timeSub: { color: theme.sub, fontSize: 12, marginTop: 2 },

  pointLabel: { color: theme.primaryDark, fontSize: 12, fontWeight: '700', marginBottom: 6, alignSelf: 'flex-end' },
  pointChip: { backgroundColor: '#F1FFF6', borderWidth: 1, borderColor: '#DDF7E7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, alignSelf: 'flex-end' },
  pointChipText: { color: theme.text, fontWeight: '800' },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointInfoBtn: {
    padding: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFFFFF',
  },
  reasonBanner: {
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBBF24',
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 240,
  },
  reasonText: {
    color: '#92400E',
    fontSize: 12,
  },

  /** one-row squares */
  squareRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  square: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  squareValue: { fontSize: 14, fontWeight: '800' },
  squareLabel: { fontSize: 11, fontWeight: '600', color: theme.sub, marginTop: 1, textTransform: 'none' },

  /** bottom actions */
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
    backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border,
    flexDirection: 'row', gap: 10,
  },
  actionBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionGhost: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  actionDanger: { backgroundColor: '#DC2626' },
  actionText: { fontWeight: '800', fontSize: 14 },

  /** modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', padding: 16, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  inputLabel: { marginTop: 12, color: theme.sub, fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  modalBtnGhost: { backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.border },
  modalBtnPrimary: { backgroundColor: theme.primary },
  modalBtnGhostText: { color: theme.text, fontWeight: '800' },
  modalBtnPrimaryText: { color: '#FFF', fontWeight: '800' },
});

export default RecentAct;
