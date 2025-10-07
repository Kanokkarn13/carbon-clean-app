import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTracking } from '../hooks/useTracking';
import MapViewComponent from '../components/MapViewComponent';

type Navigation = NativeStackNavigationProp<any>;
type TrackingScreenProps = { user: any };

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
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
  } = useTracking();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
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

  const saveEndpoint =
    goalType === 'walking'
      ? 'http://192.168.0.104:3000/api/save-walking'
      : 'http://192.168.0.104:3000/api/save-cycling';

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

      <View style={styles.maincontainer}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapViewComponent location={location} />
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
            { icon: 'map-outline', value: distance.toFixed(3), label: 'Distance', unit: 'km' },
            { icon: 'speedometer-outline', value: speed.toFixed(2), label: 'Speed', unit: 'km/h' },
            { icon: 'time-outline', value: formatTime(time), label: 'Time', unit: '' },
            ...(goalType === 'walking'
              ? [{ icon: 'footsteps-outline', value: String(steps), label: 'Steps', unit: '' }]
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
              Speed {speed.toFixed(2)} km/h · Updates {updateCount}
            </Text>
          ) : null}
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

        {/* Save Modal */}
        <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Save Activity</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                />
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>Distance: {distance.toFixed(2)} km</Text>
                <Text style={styles.summaryText}>Duration: {formatTime(time)}</Text>
                {goalType === 'walking' ? <Text style={styles.summaryText}>Steps: {steps}</Text> : null}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowModal(false)}>
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={async () => {
                    const payload: any = {
                      title: inputTitle,
                      description: inputDesc,
                      distance_km: distance,
                      duration_sec: time,
                      user_id: user.user_id,
                    };
                    if (goalType === 'walking') payload.step_total = steps;

                    try {
                      const response = await fetch(saveEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });

                      const contentType = response.headers.get('content-type');
                      if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();
                        if (response.ok) {
                          Alert.alert('✅ Saved', result.message || 'Activity saved!');
                          setShowModal(false);
                          navigation.navigate('CarbonOffsetScreen', { user, distance });
                          resetLocalState();
                        } else {
                          Alert.alert('❌ Error', result.message || 'Failed to save activity');
                        }
                      } else {
                        const text = await response.text();
                        Alert.alert('❌ Server Error', text);
                      }
                    } catch (error) {
                      Alert.alert('❌ Network Error', 'Could not connect to server');
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.modalBtnPrimaryText}>Confirm Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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

  maincontainer: { flex: 1, padding: 16, backgroundColor: theme.bg },

  mapContainer: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },

  // Toggle chips
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

  // Metrics
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

  // Debug
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

  // Actions
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

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 },
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
