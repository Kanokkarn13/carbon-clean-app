import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';

import { useTracking } from '../hooks/useTracking';
import { formatTime, saveActivity, buildSaveEndpoint } from '../utils/trackingHelpers';
import { computeCarbonReduce } from '../utils/calcCarbon'; // <-- NEW
import { saveRoutePoints } from '../services/routeStorage';

type Navigation = NativeStackNavigationProp<any>;
type TrackingScreenProps = { user: any };

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
  danger: '#EF4444',
  dangerDark: '#DC2626',
};

export default function TrackingScreen({ user }: TrackingScreenProps) {
  const navigation = useNavigation<Navigation>();

  const [goalType, setGoalType] = useState<'walking' | 'cycling'>('walking');
  const [isFinished, setIsFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // zero-out the metrics in UI after saving
  const [uiZero, setUiZero] = useState(false);

  const {
    location,
    speed,
    distance,
    time,
    steps,
    isTracking,
    startTracking,
    stopTracking,
    subscription,
    updateCount,
    routePoints,
    clearRoute,
  } = useTracking();

  const mapRef = useRef<MapView | null>(null);
  const DEFAULT_REGION: Region = {
    latitude: 13.7563,
    longitude: 100.5018,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);

  useEffect(() => {
    if (location?.coords) {
      const next: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
      setMapRegion(next);
      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion(next, 600);
        } catch {}
      }
    }
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  // derived numbers shown in UI (zero when uiZero && not tracking)
  const shownDistance = uiZero && !isTracking ? 0 : distance;
  const shownSpeed    = uiZero && !isTracking ? 0 : speed;
  const shownTime     = uiZero && !isTracking ? 0 : time;
  const shownSteps    = uiZero && !isTracking ? 0 : steps;

  const handleStart = () => {
    setUiZero(false);
    setIsFinished(false);
    startTracking();
  };

  const handleStop = () => {
    stopTracking();
    setIsFinished(true);
  };

  const resetLocalState = () => {
    setInputTitle('');
    setInputDesc('');
    setIsFinished(false);
    setGoalType('walking');
  };

  const saveEndpoint = buildSaveEndpoint(goalType);

  // ---- DEBUG: show live metrics changes ----
  useEffect(() => {
    console.log('[Tracking] metrics', {
      isTracking,
      distance_km: distance,
      speed_kmh: speed,
      time_sec: time,
      steps,
    });
  }, [isTracking, distance, speed, time, steps]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Tracking</Text>
        <View style={styles.headerSide} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          overScrollMode="always"
        >
          <View style={styles.maincontainer}>
            {/* Map */}
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                initialRegion={mapRegion}
                region={mapRegion}
                showsUserLocation
                showsMyLocationButton
                loadingEnabled
                loadingIndicatorColor={theme.primaryDark}
                rotateEnabled={false}
                toolbarEnabled={false}
                moveOnMarkerPress={false}
                onRegionChangeComplete={(r) => setMapRegion(r)}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
              >
                {location?.coords && (
                  <Marker
                    coordinate={{
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }}
                    title="You are here"
                  />
                )}
                {routePoints.length > 1 && (
                  <Polyline
                    coordinates={routePoints}
                    strokeColor="#2563EB"
                    strokeWidth={5}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                {routePoints.length > 0 && (
                  <Marker
                    coordinate={routePoints[0]}
                    pinColor="#07F890"
                    title="Start"
                  />
                )}
                {routePoints.length > 1 && (
                  <Marker
                    coordinate={routePoints[routePoints.length - 1]}
                    pinColor="#EF4444"
                    title="Finish"
                  />
                )}
              </MapView>

              {/* Recenter */}
              <TouchableOpacity
                style={styles.recenterBtn}
                onPress={() => {
                  const r = location?.coords
                    ? {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.004,
                        longitudeDelta: 0.004,
                      }
                    : DEFAULT_REGION;
                  setMapRegion(r);
                  if (mapRef.current) {
                    try {
                      mapRef.current.animateToRegion(r, 500);
                    } catch {}
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="locate-outline" size={18} color={theme.primaryDark} />
              </TouchableOpacity>

            </View>

            {/* Toggle */}
            <View style={styles.toggleContainer}>
              {(['walking', 'cycling'] as const).map((t) => {
                const active = goalType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                    onPress={() => setGoalType(t)}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name={t === 'walking' ? 'walk-outline' : 'bicycle-outline'}
                      size={16}
                      color={active ? '#FFF' : theme.primaryDark}
                    />
                    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                      {t === 'walking' ? 'Walking' : 'Cycling'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Metrics */}
            <View style={styles.metricsCard}>
              {[
                { icon: 'map-outline', value: shownDistance.toFixed(3), label: 'Distance', unit: 'km' },
                { icon: 'speedometer-outline', value: shownSpeed.toFixed(2), label: 'Speed', unit: 'km/h' },
                { icon: 'time-outline', value: formatTime(shownTime), label: 'Time', unit: '' },
                ...(goalType === 'walking'
                  ? [{ icon: 'footsteps-outline', value: String(shownSteps), label: 'Steps', unit: '' }]
                  : []),
              ].map((m, idx) => (
                <View key={`${m.label}-${idx}`} style={styles.metricItem}>
                  <View style={styles.metricIcon}>
                    <Ionicons name={m.icon as any} size={16} color={theme.primaryDark} />
                  </View>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>
                    {m.label} {m.unit ? `(${m.unit})` : ''}
                  </Text>
                </View>
              ))}
            </View>

            {/* Debug */}
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Tracking: {isTracking ? 'ACTIVE' : 'INACTIVE'}</Text>
              <Text style={styles.debugText}>Subscription: {subscription ? 'EXISTS' : 'NULL'}</Text>
              {location ? (
                <Text style={styles.debugTextSmall}>
                  Lat {location.coords.latitude.toFixed(6)} · Lng {location.coords.longitude.toFixed(6)} ·
                  Speed {shownSpeed.toFixed(2)} km/h · Updates {updateCount}
                </Text>
              ) : (
                <Text style={styles.debugTextSmall}>Waiting for GPS fix…</Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, isTracking ? styles.btnDanger : styles.btnPrimary]}
                onPress={isTracking ? handleStop : handleStart}
                activeOpacity={0.9}
              >
                <Ionicons name={isTracking ? 'square-outline' : 'play-outline'} size={18} color="#FFF" />
                <Text style={styles.actionText}>{isTracking ? 'Stop' : 'Start'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSecondary, !isFinished && { opacity: 0.6 }]}
                onPress={() => setShowModal(true)}
                disabled={!isFinished}
                activeOpacity={0.9}
              >
                <Ionicons name="save-outline" size={18} color={isFinished ? theme.primaryDark : theme.sub} />
                <Text style={[styles.actionTextSecondary, !isFinished && { color: theme.sub }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={Keyboard.dismiss}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Save Activity</Text>
                  <TouchableOpacity
                    onPress={() => setShowModal(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color={theme.sub} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    value={inputTitle}
                    onChangeText={setInputTitle}
                    placeholder="Morning ride"
                    placeholderTextColor={theme.sub}
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    value={inputDesc}
                    onChangeText={setInputDesc}
                    placeholder="Nice weather, smooth pace"
                    placeholderTextColor={theme.sub}
                    style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
                    multiline
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit
                  />
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>Distance: {shownDistance.toFixed(2)} km</Text>
                  <Text style={styles.summaryText}>Duration: {formatTime(shownTime)}</Text>
                  {goalType === 'walking' ? (
                    <Text style={styles.summaryText}>Steps: {shownSteps}</Text>
                  ) : null}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary, saving && { opacity: 0.6 }]}
                    onPress={async () => {
                      if (saving) return;
                      setSaving(true);

                      // ⬇️ NEW: compute carbon before saving
                      const carbonReduce = computeCarbonReduce(user, distance);
                      console.log('🧮 [Save] computeCarbonReduce ->', {
                        distance_km: distance,
                        vehicle: user?.vehicle,
                        carbonReduce,
                        type: typeof carbonReduce,
                        goalType,
                      });

                      const payload: any = {
                        title: inputTitle,
                        description: inputDesc,
                        distance_km: distance,
                        duration_sec: time,
                        user_id: user.user_id,
                        carbonReduce, // <-- include in initial save
                      };
                      if (goalType === 'walking') payload.step_total = steps;
                      if (routePoints.length) {
                        payload.route_points = routePoints.map((p) => ({
                          latitude: p.latitude,
                          longitude: p.longitude,
                        }));
                      }

                      console.log('📤 [Save] endpoint + payload', {
                        saveEndpoint,
                        goalType,
                        payload,
                      });

                      const result = await saveActivity(payload, saveEndpoint);

                      console.log('📥 [Save] response', result);

                      if (result.ok) {
                        // robust id extraction (string or number)
                        const activityId = ((): number | null => {
                          const d = result?.data as
                            | { activity_id?: number | string; id?: number | string; insertId?: number | string; result?: { insertId?: number | string } }
                            | undefined;
                          const raw =
                            d?.activity_id ??
                            d?.id ??
                            d?.insertId ??
                            d?.result?.insertId ??
                            null;
                          const idNum = raw != null ? Number(raw) : NaN;
                          return Number.isFinite(idNum) ? idNum : null;
                        })();

                        Alert.alert('✅ Saved', result.data?.message || 'Activity saved!');
                        setShowModal(false);

                        // ZERO OUT the UI now that we’ve saved
                        setUiZero(true);

                        if (activityId && routePoints.length) {
                          await saveRoutePoints(goalType, activityId, routePoints);
                        }
                        clearRoute();

                        // Navigate to summary (optional: pass carbonReduce too)
                        const navParams = {
                          user,
                          goalType,
                          distance,             // km
                          duration: time / 60,  // minutes
                          activityId,
                          carbonReduce,         // for display
                        };
                        console.log('➡️ [Navigate] CarbonOffsetScreen params', navParams);

                        navigation.navigate('CarbonOffsetScreen', navParams);

                        resetLocalState();
                      } else {
                        Alert.alert('❌ Error', result.data?.message || 'Failed to save activity');
                      }
                      setSaving(false);
                    }}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.modalBtnPrimaryText}>
                      {saving ? 'Saving…' : 'Confirm Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.bg,
  },
  headerSide: { width: 28, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },

  scrollContent: {
    paddingBottom: 24,
  },

  maincontainer: { flex: 1, padding: 16, backgroundColor: theme.bg },

  mapContainer: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },

  recenterBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 2,
  },

  toggleContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },
  toggleBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  toggleText: { color: theme.primaryDark, fontWeight: '700' },
  toggleTextActive: { color: '#FFF' },

  metricsCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricItem: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: { fontSize: 22, fontWeight: '800', color: theme.text },
  metricLabel: { fontSize: 12, color: theme.sub },

  debugContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
  },
  debugText: { color: theme.primaryDark, fontWeight: '700' },
  debugTextSmall: { color: theme.primaryDark, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: { backgroundColor: theme.primary },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.border },
  btnDanger: { backgroundColor: theme.danger },
  actionText: { color: '#FFF', fontWeight: '800' },
  actionTextSecondary: { color: theme.primaryDark, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
  },
  modalScroll: {
    width: '100%',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.text },

  inputWrap: { marginTop: 10 },
  inputLabel: { color: theme.sub, marginBottom: 6, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
  },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  summaryText: { color: theme.text, fontWeight: '700' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalBtnGhost: { backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.border },
  modalBtnPrimary: { backgroundColor: theme.primary },
  modalBtnGhostText: { color: theme.text, fontWeight: '800' },
  modalBtnPrimaryText: { color: '#FFF', fontWeight: '800' },
});
