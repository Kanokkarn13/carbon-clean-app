import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useTracking } from '../hooks/useTracking';
import MapViewComponent from '../components/MapViewComponent';

export default function TrackingScreen({ user }: { user: any }) {
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
      ? 'http://192.168.0.102:3000/api/save-walking'
      : 'http://192.168.0.102:3000/api/save-cycling';

  return (
    <View style={styles.maincontainer}>
      <View style={styles.mapContainer}>
        <MapViewComponent location={location} />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, goalType === 'walking' && styles.activeToggle]}
          onPress={() => setGoalType('walking')}
        >
          <Text style={[styles.toggleText, goalType === 'walking' && styles.activeText]}>Walking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, goalType === 'cycling' && styles.activeToggle]}
          onPress={() => setGoalType('cycling')}
        >
          <Text style={[styles.toggleText, goalType === 'cycling' && styles.activeText]}>Cycling</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {[{ value: distance, label: 'Distance', unit: 'km' },
          { value: speed, label: 'Speed', unit: 'km/h' },
          { value: time, label: 'Time', unit: 'mins', formatter: formatTime },
          ...(goalType === 'walking' ? [{ value: steps, label: 'Steps', unit: '' }] : []),
        ].map((metric, index) => (
          <View key={index} style={styles.minicontainer}>
            <Text style={styles.metricValue}>
              {metric.formatter ? metric.formatter(metric.value) : metric.value.toFixed(3)}
            </Text>
            <Text style={styles.metricLabel}>
              {metric.label} {metric.unit && `(${metric.unit})`}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Tracking Status: {isTracking ? 'ACTIVE' : 'INACTIVE'}</Text>
        <Text style={styles.debugText}>Subscription: {subscription ? 'EXISTS' : 'NULL'}</Text>
      </View>

      <Button
        title={isTracking ? 'Stop Tracking' : 'Start Tracking'}
        onPress={isTracking ? handleStop : handleStart}
        color={isTracking ? '#FF5252' : '#4CAF50'}
      />

      

      <Button
        title="Save Record"
        onPress={() => setShowModal(true)}
        color="#2196F3"
        disabled={!isFinished}
      />

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>Latitude: {location.coords.latitude.toFixed(6)}</Text>
          <Text style={styles.locationText}>Longitude: {location.coords.longitude.toFixed(6)}</Text>
          <Text style={styles.locationText}>Speed: {speed.toFixed(2)} km/h</Text>
          <Text style={styles.locationText}>Updates Received: {updateCount}</Text>
        </View>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000aa' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Save Activity</Text>

            <Text>Title</Text>
            <TextInput
              value={inputTitle}
              onChangeText={setInputTitle}
              placeholder="Enter title"
              style={{ borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 8 }}
            />

            <Text>Description</Text>
            <TextInput
              value={inputDesc}
              onChangeText={setInputDesc}
              placeholder="Enter description"
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 8 }}
            />

            <Text style={{ marginBottom: 5 }}>Distance: {distance.toFixed(2)} km</Text>
            <Text style={{ marginBottom: 5 }}>Duration: {formatTime(time)}</Text>
            {goalType === 'walking' && <Text style={{ marginBottom: 10 }}>Steps: {steps}</Text>}

            <Button
              title="Confirm Save"
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

                setShowModal(false);
                resetLocalState();
              }}
            />

            <Button title="Cancel" color="gray" onPress={() => setShowModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  maincontainer: { flex: 1, padding: 20, backgroundColor: '#ffffff' },
  mapContainer: { flex: 1, height: 250, marginVertical: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  toggleButton: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, backgroundColor: '#eeeeee', marginHorizontal: 8 },
  toggleText: { fontSize: 16, color: '#555', fontWeight: '500' },
  activeToggle: { backgroundColor: '#4CAF50' },
  activeText: { color: '#fff', fontWeight: 'bold' },
  container: { backgroundColor: '#f6f6f6', padding: 15, margin: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  minicontainer: { width: '48%', marginVertical: 8, padding: 12, backgroundColor: '#ffffff', borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  metricValue: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32', marginBottom: 4 },
  metricLabel: { fontSize: 14, color: '#888' },
  debugContainer: { padding: 10, backgroundColor: '#f1f8e9', borderRadius: 8, marginVertical: 10 },
  debugText: { fontSize: 12, color: '#33691E' },
  locationInfo: { marginTop: 20, alignItems: 'center' },
  locationText: { fontSize: 14, color: '#444' },
});
