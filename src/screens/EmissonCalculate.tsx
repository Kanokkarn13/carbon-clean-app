import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Alert,
  SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { calculateEmission } from '../hooks/calculateEmission';

// ---- เก็บ type ให้ตรงกับ HomeStack.tsx ----
type ActivityType = 'Cycling' | 'Walking';
type Activity = {
  type: ActivityType;
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date;
  id?: string | number;
};
type User = {
  user_id?: string | number;
  id?: string | number;
  fname?: string;
  lname?: string;
  email?: string;
};
type RootStackParamList = {
  Home: { user?: User } | undefined;
  Calculation: { user?: User } | undefined;
  EmissonCalculate: { user?: User } | undefined;
  ReduceCalculate: { user?: User } | undefined;
  SetGoal: { user?: User } | undefined;
  Dashboard: { user?: User } | undefined;
  RecentAct: { activity: Activity } | undefined;
};

// ---- API origin (อย่าใส่ /api ใน ENV) ----
const RAW_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, '');             // ตัด / ท้าย
const api = (path: string) => `${API_ORIGIN}/api${path}`;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[API_ORIGIN]', API_ORIGIN);
}

const theme = {
  green: '#07F890',
  greenDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

function ChipGroup({ options, value, onChange }:{
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LabeledInput({
  label, value, onChangeText, placeholder, keyboardType = 'default', suffix
}:{
  label: string; value: string; onChangeText: (t: string)=>void;
  placeholder?: string; keyboardType?: 'default'|'numeric'; suffix?: string;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor={theme.sub}
        />
        {suffix ? <View style={styles.suffix}><Text style={styles.suffixText}>{suffix}</Text></View> : null}
      </View>
    </View>
  );
}

function Section({ icon, title, children }:{
  icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={theme.green} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ButtonRow({ onCalc, onSave }:{ onCalc:()=>void; onSave:()=>void }) {
  return (
    <View style={styles.rowButtons}>
      <TouchableOpacity style={styles.primaryBtn} onPress={onCalc}>
        <Text style={styles.primaryBtnText}>Calculate</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} onPress={onSave}>
        <Text style={styles.ghostBtnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultBadge({ value }:{ value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.resultBadge}>
      <Ionicons name="leaf" size={16} color={theme.green} />
      <Text style={styles.resultText}>{value}</Text>
    </View>
  );
}

export default function EmissionCalculate() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList,'EmissonCalculate'>>();
  const user = route.params?.user;
  const userId = Number(user?.user_id ?? user?.id);

  // ---- States ----
  const [fuel, setFuel] = useState<'Unknown' | 'Petrol' | 'Diesel' | 'Hybrid'>('Unknown');
  const [size, setSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [distance, setDistance] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const [motorcycleSize, setMotorcycleSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [motorcycleDistance, setMotorcycleDistance] = useState('');
  const [motorcycleResult, setMotorcycleResult] = useState<string | null>(null);

  const [taxiDistance, setTaxiDistance] = useState('');
  const [taxiResult, setTaxiResult] = useState<string | null>(null);

  const [busDistance, setBusDistance] = useState('');
  const [busResult, setBusResult] = useState<string | null>(null);

  const parseKm = (v: string) => {
    const dist = parseFloat(v);
    return isNaN(dist) || dist <= 0 ? null : dist;
  };

  async function postJson(path: string, body: any) {
    const url = api(path);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
    const text = await res.text();
    if (!res.ok) {
      console.log('❌ POST failed', res.status, url, text);
      throw new Error(text || `HTTP ${res.status}`);
    }
    console.log('✅ POST ok', url, text);
    return text ? JSON.parse(text) : {};
  }

  const requireUser = () => {
    if (!Number.isInteger(userId) || userId <= 0) {
      Alert.alert('Login required', 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');
      return false;
    }
    return true;
  };

  const confirmAndSave = (payload: any) => {
    Alert.alert(
      'Save result?',
      `Activity: ${payload.activity_type}\nDistance: ${payload.distance_km} km\nEmission: ${payload.emission_kgco2e} kgCO₂e`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            try {
              await postJson('/emission', payload);
              Alert.alert('Saved', 'Your emission record has been saved.');
            } catch (err: any) {
              let msg = 'Network error';
              try {
                const parsed = JSON.parse(err?.message);
                msg = parsed?.details || parsed?.error || msg;
              } catch {
                msg = err?.message || msg;
              }
              Alert.alert('Save failed', String(msg));
            }
          },
        },
      ]
    );
  };

  // ---- Handlers ----
  const handleCalculate = () => {
    const dist = parseKm(distance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission(fuel, `${size} car`, dist);
    setResult(`${emission} kgCO₂e`);
  };

  const handleSaveCar = () => {
    if (!requireUser()) return;
    const dist = parseKm(distance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission(fuel, `${size} car`, dist);
    confirmAndSave({
      user_id: userId,
      activity_type: 'Car',
      distance_km: dist,
      emission_kgco2e: emission,
      parameters: { fuel, size },
    });
  };

  const handleMotorcycle = () => {
    const dist = parseKm(motorcycleDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Motorbike', motorcycleSize, dist);
    setMotorcycleResult(`${emission} kgCO₂e`);
  };

  const handleSaveMotor = () => {
    if (!requireUser()) return;
    const dist = parseKm(motorcycleDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Motorbike', motorcycleSize, dist);
    confirmAndSave({
      user_id: userId,
      activity_type: 'Motorcycle',
      distance_km: dist,
      emission_kgco2e: emission,
      parameters: { size: motorcycleSize },
    });
  };

  const handleTaxi = () => {
    const dist = parseKm(taxiDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Taxis', 'Regular taxi', dist);
    setTaxiResult(`${emission} kgCO₂e`);
  };

  const handleSaveTaxi = () => {
    if (!requireUser()) return;
    const dist = parseKm(taxiDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Taxis', 'Regular taxi', dist);
    confirmAndSave({
      user_id: userId,
      activity_type: 'Taxi',
      distance_km: dist,
      emission_kgco2e: emission,
      parameters: { type: 'Regular taxi' },
    });
  };

  const handleBus = () => {
    const dist = parseKm(busDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Bus', 'Average local bus', dist);
    setBusResult(`${emission} kgCO₂e`);
  };

  const handleSaveBus = () => {
    if (!requireUser()) return;
    const dist = parseKm(busDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission('Bus', 'Average local bus', dist);
    confirmAndSave({
      user_id: userId,
      activity_type: 'Bus',
      distance_km: dist,
      emission_kgco2e: emission,
      parameters: { type: 'Average local bus' },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={theme.green} />
            </TouchableOpacity>
            <Text style={styles.title}>Emission Calculator</Text>
          </View>

          {/* Car */}
          <Section icon="car-outline" title="Car">
            <Text style={styles.label}>Fuel Type</Text>
            <ChipGroup options={['Unknown', 'Petrol', 'Diesel', 'Hybrid']} value={fuel} onChange={v => setFuel(v as any)} />
            <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Size</Text>
            <ChipGroup options={['Small', 'Medium', 'Large']} value={size} onChange={v => setSize(v as any)} />
            <LabeledInput label="Distance" value={distance} onChangeText={setDistance} placeholder="e.g., 12.5" keyboardType="numeric" suffix="km" />
            <ButtonRow onCalc={handleCalculate} onSave={handleSaveCar} />
            <ResultBadge value={result} />
          </Section>

          {/* Motorcycle */}
          <Section icon="bicycle-outline" title="Motorcycle">
            <Text style={styles.label}>Motorcycle Size</Text>
            <ChipGroup options={['Small', 'Medium', 'Large']} value={motorcycleSize} onChange={v => setMotorcycleSize(v as any)} />
            <LabeledInput label="Distance" value={motorcycleDistance} onChangeText={setMotorcycleDistance} placeholder="e.g., 7" keyboardType="numeric" suffix="km" />
            <ButtonRow onCalc={handleMotorcycle} onSave={handleSaveMotor} />
            <ResultBadge value={motorcycleResult} />
          </Section>

          {/* Taxi */}
          <Section icon="car-sport-outline" title="Taxi">
            <LabeledInput label="Distance" value={taxiDistance} onChangeText={setTaxiDistance} placeholder="e.g., 15" keyboardType="numeric" suffix="km" />
            <ButtonRow onCalc={handleTaxi} onSave={handleSaveTaxi} />
            <ResultBadge value={taxiResult} />
          </Section>

          {/* Bus */}
          <Section icon="bus-outline" title="Bus">
            <LabeledInput label="Distance" value={busDistance} onChangeText={setBusDistance} placeholder="e.g., 22" keyboardType="numeric" suffix="km" />
            <ButtonRow onCalc={handleBus} onSave={handleSaveBus} />
            <ResultBadge value={busResult} />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- styles ----
const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { marginLeft: 10, fontSize: 20, fontWeight: '700', color: theme.greenDark },
  card: { backgroundColor: theme.card, borderRadius: 14, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardTitle: { fontWeight: '700', color: theme.text, fontSize: 16 },
  label: { color: theme.sub, fontSize: 13, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: '#FFF' },
  chipActive: { backgroundColor: theme.green, borderColor: theme.green },
  chipText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  inputWrap: { position: 'relative', borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: '#FFF' },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: theme.text },
  suffix: { position: 'absolute', right: 8, top: 8, bottom: 8, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  suffixText: { color: theme.sub, fontWeight: '600', fontSize: 12 },
  primaryBtn: { flex: 1, backgroundColor: theme.green, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  ghostBtn: { flex: 1, marginLeft: 10, backgroundColor: '#EFF6FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DBEAFE' },
  ghostBtnText: { color: theme.greenDark, fontWeight: '700', fontSize: 16 },
  rowButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resultBadge: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  resultText: { color: theme.greenDark, fontWeight: '700' },
});
