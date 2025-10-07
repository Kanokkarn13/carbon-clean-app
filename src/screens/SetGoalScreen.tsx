import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,   // 👈 import Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

type User = {
  user_id: number;
  walk_goal: number;
  bic_goal: number;
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
};

const SetGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = (route.params || {}) as { user?: User };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '700' }}>⚠️ User data not found.</Text>
      </SafeAreaView>
    );
  }

  const [goalType, setGoalType] = useState<'walking' | 'cycling'>('walking');
  const [distance, setDistance] = useState('0.00');

  useEffect(() => {
    const initial = goalType === 'walking' ? user.walk_goal : user.bic_goal;
    setDistance((initial ?? 0).toFixed(2));
  }, [goalType]);

  const sanitizeNumber = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return cleaned;
  };

  const handleSave = async () => {
    Keyboard.dismiss(); // 👈 Hide keyboard first

    const km = parseFloat(distance);
    if (!km || km <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a number greater than 0');
      return;
    }

    try {
      const response = await fetch('http://192.168.0.104:3000/api/set-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          goalType,
          value: km,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('✅ Goal Saved', `${goalType} set to ${km} km`);
      } else {
        Alert.alert('Error', result.message || 'Failed to save goal');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }

    if (goalType === 'walking') {
      user.walk_goal = km;
    } else {
      user.bic_goal = km;
    }
    setDistance(km.toFixed(2));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Monthly Goal</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Toggle */}
          <View style={styles.toggleWrap}>
            {(['walking', 'cycling'] as const).map((t) => {
              const active = goalType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setGoalType(t)}
                  style={[styles.toggleChip, active && styles.toggleChipActive]}
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

          {/* Circle Input */}
          <View style={styles.card}>
            <View style={styles.circle}>
              <TextInput
                style={styles.circleInput}
                keyboardType="numeric"
                value={distance}
                onChangeText={(t) => setDistance(sanitizeNumber(t))}
                maxLength={7}
              />
              <View style={styles.kmPill}>
                <Text style={styles.kmPillText}>km</Text>
              </View>
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Ionicons name="save-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Save Goal</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SetGoalScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: theme.text },
  toggleWrap: { flexDirection: 'row', alignSelf: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: theme.border, padding: 6, marginTop: 6 },
  toggleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFF' },
  toggleChipActive: { backgroundColor: theme.primary },
  toggleText: { color: theme.primaryDark, fontWeight: '700' },
  toggleTextActive: { color: '#FFF' },
  card: { marginTop: 18, alignItems: 'center' },
  circle: { width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  circleInput: { fontSize: 48, fontWeight: '800', color: theme.text, textAlign: 'center', minWidth: 160 },
  kmPill: { position: 'absolute', bottom: 20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.chip, borderWidth: 1, borderColor: '#D1FAE5' },
  kmPillText: { color: theme.primaryDark, fontWeight: '800' },
  primaryBtn: { marginTop: 18, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
