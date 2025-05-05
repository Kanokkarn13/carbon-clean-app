import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// ✅ Define user type
type User = {
  user_id: number;
  walk_goal: number;
  bic_goal: number;
};

const SetGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = (route.params || {}) as { user?: User };

    if (!user) {
    return (
        <View style={styles.container}>
        <Text style={{ color: 'red', fontSize: 16 }}>⚠️ User data not found.</Text>
        </View>
    );
    }


  const [goalType, setGoalType] = useState<'walking' | 'cycling'>('walking');
  const [distance, setDistance] = useState('0.00');

  // ✅ Set initial goal value when goalType changes
  useEffect(() => {
    const initial = goalType === 'walking' ? user.walk_goal : user.bic_goal;
    setDistance(initial?.toFixed(2) || '0.00');
  }, [goalType]);

  const handleSave = async () => {
    const km = parseFloat(distance);
    if (!km || km <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a number greater than 0');
      return;
    }
  
    try {
        const response = await fetch('http://192.168.0.102:3000/api/set-goal', { //  เปลี่ยน IP เด้วยจ้าตอนเแปลี่ยนเครื่อง
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.user_id,
              goalType: goalType,
              value: km,
            }),
          });
          
  
      const result = await response.json();
  
      if (response.ok) {
        Alert.alert('✅ Goal Saved', `${goalType} set to ${km} km`);
      } else {
        console.error('❌ Server error:', result);
        Alert.alert('Error', result.message || 'Failed to save goal');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
    if (goalType === 'walking') {
        user.walk_goal = km;
      } else {
        user.bic_goal = km;
      }
      setDistance(km.toFixed(2)); // ✅ อัปเดต UI ให้ตรง
      
  };
  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#00AA55" />
        </TouchableOpacity>
        <Text style={styles.title}>Monthly Goal</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Toggle Goal Type */}
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

      {/* Circle Input */}
      <View style={styles.circleWrapper}>
        <View style={styles.circle}>
          <TextInput
            style={styles.circleInput}
            keyboardType="numeric"
            value={distance}
            onChangeText={setDistance}
            maxLength={6}
          />
          <Text style={styles.kmLabel}>kilometers</Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Goal</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default SetGoalScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, backgroundColor: '#fff' },
  header: { flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f3f3f3', borderRadius: 12, alignSelf: 'center', overflow: 'hidden', marginBottom: 30 },
  toggleButton: { paddingVertical: 10, paddingHorizontal: 30 },
  toggleText: { fontSize: 16, color: '#999' },
  activeToggle: { backgroundColor: '#fff' },
  activeText: { color: '#000', fontWeight: 'bold' },
  circleWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle: { width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  circleInput: { fontSize: 48, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  kmLabel: { fontSize: 14, color: '#888', marginTop: 4 },
  saveButton: { backgroundColor: '#00AA55', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 30 },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

