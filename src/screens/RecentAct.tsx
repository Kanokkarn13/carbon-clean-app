// src/screens/RecentAct.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeStack';
import type { ActivityPayload } from '../types/activity';

let MapView: any = null;
try { MapView = require('react-native-maps').default; } catch {}

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecentAct'>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';

const theme = { primary: '#10B981', primaryDark: '#059669', bg: '#F6FAF8', card: '#FFFFFF', text: '#0B1721', sub: '#6B7280', border: '#E5E7EB', chip: '#ECFDF5', chipBorder: '#D1FAE5', muted: '#F3F4F6' };

function fmtNumber(n?: number, digits = 0) { if (typeof n !== 'number' || Number.isNaN(n)) return '—'; return n.toFixed(digits); }
function fmtDuration(sec?: number) { if (typeof sec !== 'number' || Number.isNaN(sec)) return '—'; const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.floor(sec % 60); return h ? `${h}:${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}` : `${m}:${`${s}`.padStart(2, '0')}`; }
function fmtDate(dt?: string | Date) { if (!dt) return '—'; const d = new Date(dt); if (isNaN(d.getTime())) return '—'; const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); return `${date}  ·  ${time}`; }
function toNum(v: unknown): number | undefined { const n = Number(v); return Number.isFinite(n) ? n : undefined; }

const RecentAct: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const params = (route?.params ?? {}) as Record<string, unknown>;
  const activity: ActivityPayload | undefined = params.activity as any;

  const typeLabel = (activity as any)?.type || 'Activity';
  const typeSlug = String(typeLabel).toLowerCase().includes('cycl') ? 'cycling' : 'walking';
  const id = (activity as any)?.id;
  const title0 = activity?.title || (activity as any)?.type || 'Title';
  const description0 = activity?.description || '';
  const distanceKm = typeof activity?.distance_km === 'number' ? activity.distance_km : toNum((activity as any)?.distance_km);
  const steps = typeof activity?.step_total === 'number' ? activity.step_total.toLocaleString() : toNum((activity as any)?.step_total)?.toLocaleString();
  const duration = fmtDuration(typeof activity?.duration_sec === 'number' ? activity.duration_sec : toNum((activity as any)?.duration_sec));
  const recordDate = fmtDate((activity as any)?.record_date ?? (activity as any)?.created_at);

  const carbonReduceKgTop = toNum(params.carbonReduce);
  const carbonReduceKgAct = toNum((activity as any)?.carbonReduce) ?? toNum((activity as any)?.carbon_reduce_kg);
  const carbonReduceGAct = toNum((activity as any)?.carbon_reduce_g);
  const carbonKg = carbonReduceKgTop ?? carbonReduceKgAct ?? (carbonReduceGAct != null ? carbonReduceGAct / 1000 : undefined);
  const carbonG = carbonKg != null ? Math.round(carbonKg * 1000) : carbonReduceGAct;

  const points = typeof (activity as any)?.points === 'number' ? (activity as any).points : undefined;
  const progressPct = typeof (activity as any)?.progress_pct === 'number' && !Number.isNaN((activity as any).progress_pct) ? Math.max(0, Math.min(1, (activity as any).progress_pct)) : 0.3;

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(title0);
  const [editDesc, setEditDesc] = useState(description0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => { setEditTitle(title0); setEditDesc(description0); }, [title0, description0]);

  const endpointBase = useMemo(() => `${API_BASE}/api/${typeSlug}`, [typeSlug]);

  const doPatch = async () => {
    if (!id) return Alert.alert('Missing id', 'This activity has no id.');
    try {
      setSaving(true);
      const res = await fetch(`${endpointBase}/${encodeURIComponent(String(id))}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle, description: editDesc }) });
      const text = await res.text();
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? JSON.parse(text) : { message: text };
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      Alert.alert('Updated', 'Activity updated.');
      setShowEdit(false);
      navigation.goBack();
    } catch (e: any) { Alert.alert('Update failed', e?.message || 'Unknown error'); } finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!id) return Alert.alert('Missing id', 'This activity has no id.');
    Alert.alert('Delete activity', 'This action cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setDeleting(true);
          const res = await fetch(`${endpointBase}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
          const text = await res.text();
          const isJson = (res.headers.get('content-type') || '').includes('application/json');
          const data = isJson ? JSON.parse(text) : { message: text };
          if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
          Alert.alert('Deleted', 'Activity removed.');
          navigation.goBack();
        } catch (e: any) { Alert.alert('Delete failed', e?.message || 'Unknown error'); } finally { setDeleting(false); }
      } },
    ], { cancelable: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.primaryDark} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrap}>
          {MapView ? (
            <MapView style={StyleSheet.absoluteFill} initialRegion={{ latitude: 13.7563, longitude: 100.5018, latitudeDelta: 0.06, longitudeDelta: 0.06 }} pointerEvents="none" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}><Ionicons name="map" size={28} color={theme.sub} /><Text style={{ color: theme.sub, marginTop: 6 }}>Map preview</Text></View>
          )}
          <View style={styles.mapTabs}>
            <View style={[styles.mapTab, styles.mapTabActive]}><Text style={styles.mapTabTextActive}>Map</Text></View>
            <View style={styles.mapTab}><Text style={styles.mapTabText}>Satellite</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.rowBetween}>
              <Text style={styles.labelBold}>Title:</Text>
              <Text style={styles.linkTitle} numberOfLines={1}>{title0 || '—'}</Text>
            </View>
            <View style={styles.actionsRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEdit(true)}><Ionicons name="pencil" size={16} color={theme.primaryDark} /><Text style={styles.iconBtnText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={doDelete} disabled={deleting}><Ionicons name="trash" size={16} color="#DC2626" /><Text style={[styles.iconBtnText, { color: '#DC2626' }]}>{deleting ? 'Deleting…' : 'Delete'}</Text></TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <View style={styles.descBox}><Text style={styles.descText}>{description0 || ' '}</Text></View>

          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}><Text style={styles.dateMain}>{recordDate}</Text></View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.pointLabel}>Point Recieved</Text>
              <View style={styles.pointChip}><Text style={styles.pointChipText}>{typeof points === 'number' ? `${points} P` : '2000 P'}</Text></View>
            </View>
          </View>
        </View>

        {/* Inline rows */}
        <View style={styles.inlineStatsRow}>
          <Ionicons name="leaf" size={16} color={theme.primaryDark} />
          <Text style={styles.inlineText}>Carbon Reduce: <Text style={styles.inlineValue}>{fmtNumber(carbonG, 0)} g</Text></Text>
          <Ionicons name="location" size={16} color={theme.primaryDark} style={{ marginLeft: 16 }} />
          <Text style={styles.inlineText}>Distance: <Text style={styles.inlineValue}>{fmtNumber(distanceKm, 2)} km</Text></Text>
        </View>

        <View style={styles.inlineStatsRow}>
          <Ionicons name="time-outline" size={16} color={theme.primaryDark} />
          <Text style={styles.inlineText}>Duration: <Text style={styles.inlineValue}>{duration}</Text></Text>
          {steps ? (<><Ionicons name="walk-outline" size={16} color={theme.primaryDark} style={{ marginLeft: 16 }} /><Text style={styles.inlineText}>Steps: <Text style={styles.inlineValue}>{steps}</Text></Text></>) : null}
        </View>

        <View style={styles.progressWrap}>
          <Text style={styles.progressTitle}>Your Current Progress</Text>
          <View style={styles.progressHeader}>
            <View style={styles.progressRing}><Ionicons name="checkmark" size={18} color={theme.primaryDark} /></View>
            <Text style={styles.progressPctText}>{Math.round(progressPct * 100)}%<Text style={styles.progressSub}> from your goal</Text></Text>
          </View>
          <View style={styles.progressBarTrack}><View style={[styles.progressBarFill, { width: `${Math.round(progressPct * 100)}%` }]} /></View>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Activity</Text>
                <TouchableOpacity onPress={() => setShowEdit(false)}><Ionicons name="close" size={22} color={theme.sub} /></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} placeholder="Title" placeholderTextColor={theme.sub} />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Description</Text>
              <TextInput style={[styles.input, { height: 96, textAlignVertical: 'top' }]} value={editDesc} onChangeText={setEditDesc} placeholder="Description" placeholderTextColor={theme.sub} multiline />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowEdit(false)}><Text style={styles.modalBtnGhostText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary, saving && { opacity: 0.6 }]} onPress={doPatch} disabled={saving}><Ionicons name="save-outline" size={18} color="#FFF" /><Text style={styles.modalBtnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const RADIUS = 16;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, backgroundColor: theme.bg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.chip, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.chipBorder },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 18, color: theme.text, marginRight: 36 },
  mapWrap: { height: 220, marginHorizontal: 16, marginBottom: 12, borderRadius: RADIUS, overflow: 'hidden', backgroundColor: theme.muted, borderWidth: 1, borderColor: theme.border },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mapTabs: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', padding: 3, borderRadius: 10 },
  mapTab: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  mapTabActive: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  mapTabText: { color: theme.sub, fontSize: 12, fontWeight: '600' },
  mapTabTextActive: { color: theme.text, fontSize: 12, fontWeight: '700' },

  card: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: RADIUS, padding: 16, borderWidth: 1, borderColor: theme.border },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  actionsRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  iconBtnText: { color: theme.primaryDark, fontWeight: '700' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 1 },

  labelBold: { color: theme.text, fontWeight: '800', fontSize: 16 },
  linkTitle: { color: theme.primaryDark, fontWeight: '800', fontSize: 16 },

  label: { color: theme.sub, fontSize: 12, fontWeight: '700' },
  descBox: { marginTop: 6, minHeight: 64, backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12 },
  descText: { color: theme.sub, fontSize: 14 },

  dateMain: { color: theme.text, fontSize: 14, fontWeight: '700' },

  pointLabel: { color: theme.primaryDark, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  pointChip: { backgroundColor: theme.chip, borderWidth: 1, borderColor: theme.chipBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  pointChipText: { color: theme.text, fontWeight: '800' },

  smallMuted: { color: theme.sub, fontSize: 11, marginTop: 8 },
  durationText: { color: theme.text, fontWeight: '700', marginTop: 2 },

  inlineStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 10, gap: 4 },
  inlineText: { color: theme.text, fontSize: 14, marginLeft: 4 },
  inlineValue: { color: theme.primaryDark, fontWeight: '700' },

  progressWrap: { marginTop: 16, marginHorizontal: 16, backgroundColor: theme.card, borderRadius: RADIUS, padding: 16, borderWidth: 1, borderColor: theme.border },
  progressTitle: { fontWeight: '800', fontSize: 16, color: theme.text, marginBottom: 12, textAlign: 'center' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: theme.chipBorder, backgroundColor: theme.chip, alignItems: 'center', justifyContent: 'center' },
  progressPctText: { fontSize: 18, fontWeight: '800', color: theme.text },
  progressSub: { fontSize: 14, fontWeight: '600', color: theme.sub },
  progressBarTrack: { height: 8, borderRadius: 6, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 6, backgroundColor: theme.primary },

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
