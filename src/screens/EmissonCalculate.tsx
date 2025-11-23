import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { calculateEmission, useEmissionFactors, loadEmissionData, getEmissionUnits } from '../hooks/calculateEmission';

type ActivityType = 'Cycling' | 'Walking';
type Activity = { type: ActivityType; title?: string; description?: string; distance_km?: number; step_total?: number; duration_sec?: number; record_date?: string | Date; id?: string | number };
type User = { user_id?: string | number; id?: string | number; fname?: string; lname?: string; email?: string };
type RootStackParamList = {
  Home: { user?: User } | undefined;
  Calculation: { user?: User } | undefined;
  EmissonCalculate: { user?: User } | undefined;
  ReduceCalculate: { user?: User } | undefined;
  SetGoal: { user?: User } | undefined;
  Dashboard: { user?: User } | undefined;
  RecentAct: { activity: Activity } | undefined;
};

const RAW_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, '');
const api = (path: string) => `${API_ORIGIN}/api${path}`;

const theme = {
  green: '#07F890',
  greenDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

function ChipGroup({ options, value, onChange, scrollable = false }: { options: string[]; value: string; onChange: (v: string) => void; scrollable?: boolean }) {
  const content = options.map((opt) => {
    const active = opt === value;
    return (
      <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
      </TouchableOpacity>
    );
  });
  if (!scrollable) return <View style={styles.chipRow}>{content}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {content}
    </ScrollView>
  );
}

function LabeledInput({ label, value, onChangeText, placeholder, keyboardType = 'default', suffix }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric'; suffix?: string }) {
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
        {suffix ? (
          <View style={styles.suffix}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
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

function ButtonRow({ onCalc, onSave }: { onCalc: () => void; onSave?: () => void }) {
  return (
    <View style={styles.rowButtons}>
      <TouchableOpacity style={styles.primaryBtn} onPress={onCalc}>
        <Text style={styles.primaryBtnText}>Calculate</Text>
      </TouchableOpacity>
      {onSave ? (
        <TouchableOpacity style={styles.ghostBtn} onPress={onSave}>
          <Text style={styles.ghostBtnText}>Save</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ResultBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.resultBadge}>
      <Ionicons name="leaf" size={16} color={theme.green} />
      <Text style={styles.resultText}>{value}</Text>
    </View>
  );
}

type ActivityState = Record<string, { cls: string; amount: string; result: string | null }>;

export default function EmissionCalculate() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EmissonCalculate'>>();
  const user = route.params?.user;
  const userId = Number(user?.user_id ?? user?.id);
  const { data: factorData, loading: factorLoading, error: factorError, reload: reloadFactors } = useEmissionFactors();
  const units = useMemo(() => getEmissionUnits(), []);

  const carFuelKeys = new Set(['Diesel', 'Petrol', 'Hybrid', 'CNG', 'Unknown']);

  const carFuels = useMemo(
    () => Object.keys(factorData || {}).filter((k) => carFuelKeys.has(k)),
    [factorData],
  );

  const activities = useMemo(
    () => Object.keys(factorData || {}).filter((k) => !carFuelKeys.has(k)),
    [factorData],
  );

  const [carFuel, setCarFuel] = useState<string>('Petrol');
  const [carSize, setCarSize] = useState<string>('Small car');
  const [carDistance, setCarDistance] = useState<string>('');
  const [carResult, setCarResult] = useState<string | null>(null);

  const [activityState, setActivityState] = useState<ActivityState>({});

  useEffect(() => {
    if (carFuels.length && !carFuels.includes(carFuel)) {
      setCarFuel(carFuels[0]);
    }
  }, [carFuels, carFuel]);

  useEffect(() => {
    const table = (factorData as any)?.[carFuel];
    const sizes = table ? Object.keys(table) : ['Small car', 'Medium car', 'Large car', 'Average car'];
    if (!sizes.includes(carSize)) setCarSize(sizes[0]);
  }, [carFuel, carSize, factorData]);

  useEffect(() => {
    const next: ActivityState = {};
    activities.forEach((act) => {
      const classes = Object.keys((factorData as any)?.[act] || {});
      next[act] = {
        cls: activityState[act]?.cls || classes[0] || 'default',
        amount: activityState[act]?.amount || '',
        result: activityState[act]?.result || null,
      };
    });
    setActivityState(next);
  }, [activities, factorData]);

  const parseAmount = (v: string) => {
    const dist = parseFloat(v);
    return isNaN(dist) || dist <= 0 ? null : dist;
  };

  const ensureFactorsReady = async () => {
    try {
      await loadEmissionData(true);
      return true;
    } catch (err: any) {
      Alert.alert('Emission factors unavailable', err?.message || 'Could not load emission data.', [
        { text: 'Retry', onPress: () => reloadFactors() },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return false;
    }
  };

  const handleCalcCar = async () => {
    if (!(await ensureFactorsReady())) return;
    const dist = parseAmount(carDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission(carFuel, carSize, dist);
    if (typeof emission !== 'number') return Alert.alert('Factor missing', String(emission));
    setCarResult(`${emission} kgCO₂e`);
  };

  const handleCalcActivity = async (activity: string) => {
    if (!(await ensureFactorsReady())) return;
    const state = activityState[activity];
    const dist = parseAmount(state?.amount || '');
    if (!dist) return Alert.alert('Invalid', 'Enter valid amount');
    const emission = calculateEmission(activity, state?.cls, dist);
    if (typeof emission !== 'number') return Alert.alert('Factor missing', String(emission));
    setActivityState((prev) => ({
      ...prev,
      [activity]: { ...(prev[activity] || {}), result: `${emission} kgCO₂e` },
    }));
  };

  const saveToBackend = async (activity: string, distance: number, emission: number, param: string | null) => {
    if (!userId || userId <= 0) {
      Alert.alert('Login required', 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');
      return;
    }
    const payload = {
      user_id: userId,
      activity_type: activity,
      distance_km: distance,
      emission_kgco2e: emission,
      parameters: param ? { type: param } : {},
    };
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
  };

  const handleSaveCar = async () => {
    if (!(await ensureFactorsReady())) return;
    const dist = parseAmount(carDistance);
    if (!dist) return Alert.alert('Invalid', 'Enter valid distance');
    const emission = calculateEmission(carFuel, carSize, dist);
    if (typeof emission !== 'number') return Alert.alert('Factor missing', String(emission));
    await saveToBackend('Car', dist, emission, `${carFuel} ${carSize}`);
  };

  const handleSaveActivity = async (activity: string) => {
    if (!(await ensureFactorsReady())) return;
    const state = activityState[activity];
    const dist = parseAmount(state?.amount || '');
    if (!dist) return Alert.alert('Invalid', 'Enter valid amount');
    const emission = calculateEmission(activity, state?.cls, dist);
    if (typeof emission !== 'number') return Alert.alert('Factor missing', String(emission));
    await saveToBackend(activity, dist, emission, state?.cls || null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={theme.green} />
            </TouchableOpacity>
            <Text style={styles.title}>Emission Calculator</Text>
          </View>

          {factorLoading && <Text style={styles.label}>Loading factors…</Text>}
          {factorError && (
            <TouchableOpacity onPress={() => reloadFactors()} activeOpacity={0.8}>
              <Text style={[styles.label, { color: '#B91C1C' }]}>Failed to load factors. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {/* Car container (all fuels in one) */}
          {carFuels.length > 0 && (
            <Section icon="car-outline" title="Car">
              <Text style={styles.label}>Fuel Type</Text>
              <ChipGroup options={carFuels} value={carFuel} onChange={(v) => setCarFuel(v)} scrollable />

              <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Size</Text>
              <ChipGroup
                options={(factorData as any)?.[carFuel] ? Object.keys((factorData as any)[carFuel]) : ['Small car', 'Medium car', 'Large car', 'Average car']}
                value={carSize}
                onChange={(v) => setCarSize(v)}
                scrollable
              />

              <LabeledInput
                label="Distance"
                value={carDistance}
                onChangeText={setCarDistance}
                placeholder="e.g., 12.5"
                keyboardType="numeric"
                suffix="km"
              />
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCalcCar}>
                <Text style={styles.primaryBtnText}>Calculate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleSaveCar}>
                <Text style={styles.ghostBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            <ResultBadge value={carResult} />
          </Section>
          )}

          {/* Other activities (transport + electricity) */}
          {activities.map((activity) => {
            const classes = Object.keys((factorData as any)?.[activity] || {});
            const state = activityState[activity] || { cls: classes[0] || 'default', amount: '', result: null };
            const unit = units?.[activity]?.[state.cls] || units?.[activity]?.[classes[0]] || 'km';
            const label = activity === 'Motorbike' ? 'Motorcycles' : activity;
            const icon: keyof typeof Ionicons.glyphMap =
              activity.toLowerCase().includes('flight') ? 'airplane' :
              activity.toLowerCase().includes('rail') ? 'train' :
              activity.toLowerCase().includes('bus') ? 'bus' :
              activity.toLowerCase().includes('ferry') ? 'boat' :
              activity.toLowerCase().includes('motor') ? 'bicycle' :
              activity.toLowerCase().includes('electric') ? 'flash' :
              'car-outline';

            return (
              <Section key={activity} icon={icon} title={label}>
                <Text style={styles.label}>Class / Type</Text>
                <ChipGroup
                  options={classes.length ? classes : ['default']}
                  value={state.cls}
                  onChange={(v) =>
                    setActivityState((prev) => ({
                      ...prev,
                      [activity]: { ...(prev[activity] || {}), cls: v, result: null },
                    }))
                  }
                  scrollable
                />

                <LabeledInput
                  label={`Amount (${unit || 'km'})`}
                  value={state.amount}
                  onChangeText={(v) =>
                    setActivityState((prev) => ({
                      ...prev,
                      [activity]: { ...(prev[activity] || {}), amount: v },
                    }))
                  }
                  placeholder="Enter value"
                  keyboardType="numeric"
                  suffix={unit || 'km'}
                />

                <ButtonRow onCalc={() => handleCalcActivity(activity)} onSave={() => handleSaveActivity(activity)} />
                <ResultBadge value={state.result} />
              </Section>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    throw new Error(text || `HTTP ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

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
