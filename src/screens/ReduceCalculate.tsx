// src/screens/ReduceCalculate.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { calculateEmission, useEmissionFactors, loadEmissionData } from '../hooks/calculateEmission';

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

const VEHICLES = ['Car', 'Motorbike', 'Bus', 'Rail', 'Flights', 'Ferry', 'Electricity', 'Taxis'] as const;

// ---- API origin (ENV; don't put /api and no trailing slash) ----
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
const API_BASE = RAW_BASE.replace(/\/+$/, '');     // strip trailing slashes
const api = (p: string) => `${API_BASE}/api${p}`;

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  scrollable = false,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  scrollable?: boolean;
}) {
  const content = (
    <View style={[styles.chipRow, scrollable && { flexWrap: 'nowrap' }]}>
      {options.map((opt) => (
        <Chip key={opt} label={opt} active={opt === value} onPress={() => onChange(opt)} />
      ))}
    </View>
  );
  if (!scrollable) return content;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((opt) => (
        <Chip key={opt} label={opt} active={opt === value} onPress={() => onChange(opt)} />
      ))}
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  suffix?: string;
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
          placeholderTextColor={theme.sub}
          keyboardType="numeric"
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

function Card({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={theme.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: any;
}) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, style]} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

function ResultBanner({
  text,
  tone = 'positive',
}: {
  text: string;
  tone?: 'positive' | 'warning' | 'neutral';
}) {
  const styleMap =
    tone === 'warning'
      ? { bg: '#FEF3C7', border: '#FDE68A', color: '#92400E', icon: 'alert-circle' as const }
      : tone === 'neutral'
      ? { bg: '#F3F4F6', border: '#E5E7EB', color: '#374151', icon: 'information-circle' as const }
      : { bg: '#ECFDF5', border: '#D1FAE5', color: theme.primaryDark, icon: 'leaf' as const };

  return (
    <View style={[styles.resultWrap, { backgroundColor: styleMap.bg, borderColor: styleMap.border }]}>
      <Ionicons name={styleMap.icon} size={16} color={styleMap.color} />
      <Text style={[styles.resultText, { color: styleMap.color }]}>{text}</Text>
    </View>
  );
}

export default function ReduceCalculate() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const user = (route?.params && (route.params as any).user) || undefined;
  const {
    data: factorData,
    reload: reloadFactors,
  } = useEmissionFactors();

  const [fromVehicle, setFromVehicle] = useState<string>('Car');
  const [fromFuel, setFromFuel] = useState<string>('Petrol');
  const [fromSize, setFromSize] = useState('Small car');

  const [toVehicle, setToVehicle] = useState<string>('Bus');
  const [toFuel, setToFuel] = useState<string | ''>('');
  const [toSize, setToSize] = useState('Average local bus');

  const [distance, setDistance] = useState('');
  const [reduction, setReduction] = useState<number | null>(null);

  const [electricLastMonth, setElectricLastMonth] = useState('');
  const [electricThisMonth, setElectricThisMonth] = useState('');
  const [electricReduction, setElectricReduction] = useState<number | null>(null);

  const carFuels = useMemo(
    () =>
      Object.keys(factorData || {}).filter((k) =>
        ['Diesel', 'Petrol', 'Hybrid', 'CNG', 'Unknown'].includes(k)
      ),
    [factorData]
  );
  const vehicleOptions = useMemo(() => {
    const keys = Object.keys(factorData || {}).filter(
      (k) => !['Diesel', 'Petrol', 'Hybrid', 'CNG', 'Unknown'].includes(k)
    );
    const base = ['Car', ...keys];
    const extra = VEHICLES.filter((v) => !base.includes(v));
    return [...new Set([...base, ...extra])];
  }, [factorData]);

  const getVehicleClasses = (vehicle: string, fuel?: string) => {
    const source: any = factorData;
    if (vehicle === 'Car') {
      const table = source[fuel || carFuels[0] || 'Petrol'];
      return table ? Object.keys(table) : [];
    }
    const table = source[vehicle];
    return table ? Object.keys(table) : [];
  };

  const fromClassOptions = useMemo(
    () => getVehicleClasses(fromVehicle, fromFuel),
    [fromVehicle, fromFuel, factorData]
  );
  const toClassOptions = useMemo(
    () => getVehicleClasses(toVehicle, toFuel || undefined),
    [toVehicle, toFuel, factorData]
  );

  // If an activity has no classes, present a single default option to prevent empty chips.
  useEffect(() => {
    if (fromClassOptions.length === 0) {
      setFromSize('default');
    }
  }, [fromClassOptions]);

  useEffect(() => {
    if (toClassOptions.length === 0) {
      setToSize('default');
    }
  }, [toClassOptions]);

  useEffect(() => {
    if (fromClassOptions.length && !fromClassOptions.includes(fromSize)) {
      setFromSize(fromClassOptions[0]);
    }
  }, [fromClassOptions, fromSize]);

  useEffect(() => {
    if (toClassOptions.length && !toClassOptions.includes(toSize)) {
      setToSize(toClassOptions[0]);
    }
  }, [toClassOptions, toSize]);

  const parseNum = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const ensureFactorsReady = async () => {
    try {
      await loadEmissionData();
      return true;
    } catch (err: any) {
      Alert.alert('Emission factors unavailable', err?.message || 'Could not load emission data.', [
        { text: 'Retry', onPress: () => reloadFactors() },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return false;
    }
  };

  const handleCalculate = async () => {
    if (!(await ensureFactorsReady())) return;
    const dist = parseNum(distance);
    if (dist == null) return Alert.alert('Invalid distance', 'Please enter a positive number.');

    const fromEmission = calculateEmission(
      fromVehicle === 'Car' ? fromFuel : fromVehicle,
      fromSize,
      dist
    );
    const toEmission = calculateEmission(
      toVehicle === 'Car' ? (toFuel || 'Unknown') : toVehicle,
      toSize,
      dist
    );

    if (typeof fromEmission !== 'number' || typeof toEmission !== 'number') {
      return Alert.alert('Calculation error', 'Emission calculation returned invalid values.');
    }
    setReduction(fromEmission - toEmission);
  };

  const handleElectricReduction = () => {
    const last = parseNum(electricLastMonth);
    const curr = parseNum(electricThisMonth);
    if (last == null || curr == null)
      return Alert.alert('Invalid kWh', 'Provide positive numbers for both months.');
    const EF = 0.233; // kgCO2e per kWh (example)
    setElectricReduction(last * EF - curr * EF);
  };

  const userId = Number(user?.user_id ?? user?.id);

  // --- Save transport reduction ---
  const handleSave = async () => {
    if (!(await ensureFactorsReady())) return;
    if (!userId || userId <= 0) {
      Alert.alert('Login required', 'Please log in before saving.');
      return;
    }
    const dist = parseNum(distance);
    if (dist == null) return Alert.alert('Invalid distance', 'Enter a positive number.');

    const fromEmission = calculateEmission(
      fromVehicle === 'Car' ? fromFuel : fromVehicle,
      fromSize,
      dist
    );
    const toEmission = calculateEmission(
      toVehicle === 'Car' ? (toFuel || 'Unknown') : toVehicle,
      toSize,
      dist
    );
    const reduced = Number(fromEmission) - Number(toEmission);

    if (!(reduced > 0)) {
      Alert.alert(
        'Not a reduction',
        'This change does not reduce emissions, so it cannot be saved as a reduction.'
      );
      return;
    }

    const payload = {
      user_id: userId,
      point_value: reduced.toFixed(2),
      distance_km: dist,
      activity_from: fromVehicle,
      param_from: fromVehicle === 'Car' ? `${fromFuel} ${fromSize}` : fromSize,
      activity_to: toVehicle,
      param_to: toVehicle === 'Car' ? `${toFuel || 'Unknown'} ${toSize}` : toSize,
    };

    try {
      const res = await fetch(api('/reduction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      Alert.alert('Saved', 'Your reduction has been saved.');
    } catch (e: any) {
      let msg = e?.message || 'Network error';
      try {
        const j = JSON.parse(msg);
        msg = j?.details || j?.error || msg;
      } catch {}
      Alert.alert('Save failed', String(msg));
    }
  };

  // --- Save electricity reduction ---
  const handleElectricSave = async () => {
    if (!userId || userId <= 0) {
      Alert.alert('Login required', 'Please log in before saving.');
      return;
    }
    const last = parseNum(electricLastMonth);
    const curr = parseNum(electricThisMonth);
    if (last == null || curr == null)
      return Alert.alert('Invalid kWh', 'Provide positive numbers for both months.');
    const EF = 0.233;
    const reduced = last * EF - curr * EF;

    if (!(reduced > 0)) {
      Alert.alert(
        'Not a reduction',
        'Your electricity use did not go down, so this cannot be saved as a reduction.'
      );
      return;
    }

    // Backend requires a positive distance_km. Use the kWh difference as a positive numeric token.
    const distance_km = +(last - curr).toFixed(2);

    const payload = {
      user_id: userId,
      point_value: reduced.toFixed(2),
      distance_km: distance_km > 0 ? distance_km : 1, // ensure > 0
      activity_from: 'Electricity',
      param_from: `${last} kWh (last month)`,
      activity_to: 'Electricity',
      param_to: `${curr} kWh (this month)`,
    };

    try {
      const res = await fetch(api('/reduction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      Alert.alert('Saved', 'Your electricity reduction has been saved.');
    } catch (e: any) {
      let msg = e?.message || 'Network error';
      try {
        const j = JSON.parse(msg);
        msg = j?.details || j?.error || msg;
      } catch {}
      Alert.alert('Save failed', String(msg));
    }
  };

  const onChangeFromVehicle = (v: string) => {
    setFromVehicle(v);
    if (v === 'Car') {
      const defaultFuel = carFuels[0] || 'Petrol';
      setFromFuel(defaultFuel);
      const cls = getVehicleClasses('Car', defaultFuel);
      setFromSize(cls[0] || '');
    } else {
      setFromFuel('Petrol');
      const cls = getVehicleClasses(v);
      setFromSize(cls[0] || '');
    }
  };

  const onChangeToVehicle = (v: string) => {
    setToVehicle(v);
    if (v === 'Car') {
      const defaultFuel = carFuels[0] || 'Petrol';
      setToFuel(defaultFuel);
      const cls = getVehicleClasses('Car', defaultFuel);
      setToSize(cls[0] || '');
    } else {
      setToFuel('');
      const cls = getVehicleClasses(v);
      setToSize(cls[0] || '');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Reduce Carbon</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Transport switching */}
        <Card icon="swap-vertical" title="Switch Your Transport">
          <Text style={styles.label}>Vehicle you normally use</Text>
          <ChipGroup
            options={vehicleOptions as unknown as string[]}
            value={fromVehicle}
            onChange={(v) => onChangeFromVehicle(v as any)}
          />
          {fromVehicle === 'Car' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Fuel</Text>
              <ChipGroup
                options={(carFuels.length ? carFuels : ['Petrol', 'Diesel', 'Hybrid', 'CNG', 'Unknown']) as unknown as string[]}
                value={fromFuel}
                onChange={(v) => {
                  setFromFuel(v as any);
                  const cls = getVehicleClasses('Car', v);
                  if (cls.length) setFromSize(cls[0]);
                }}
              />
            </>
          )}
          <Text style={[styles.label, { marginTop: 12 }]}>Class</Text>
          <ChipGroup options={fromClassOptions} value={fromSize} onChange={setFromSize} scrollable />

          <View style={styles.divider} />

          <Text style={styles.label}>Vehicle you switch to</Text>
          <ChipGroup
            options={vehicleOptions as unknown as string[]}
            value={toVehicle}
            onChange={(v) => onChangeToVehicle(v as any)}
          />
          {toVehicle === 'Car' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Fuel</Text>
              <ChipGroup
                options={(carFuels.length ? carFuels : ['Petrol', 'Diesel', 'Hybrid', 'CNG', 'Unknown']) as unknown as string[]}
                value={toFuel || (carFuels[0] || 'Petrol')}
                onChange={(v) => {
                  setToFuel(v as any);
                  const cls = getVehicleClasses('Car', v);
                  if (cls.length) setToSize(cls[0]);
                }}
              />
            </>
          )}
          <Text style={[styles.label, { marginTop: 12 }]}>Class</Text>
          <ChipGroup options={toClassOptions} value={toSize} onChange={setToSize} scrollable />

          <LabeledInput
            label="Distance"
            value={distance}
            onChangeText={setDistance}
            placeholder="e.g., 12.5"
            suffix="km"
          />

          {/* Action row: Calculate + Save */}
          <View style={styles.actionsRow}>
            <PrimaryButton title="Calculate Reduction" onPress={handleCalculate} />
            <PrimaryButton
              title="Save"
              onPress={handleSave}
              style={{ backgroundColor: theme.primaryDark }}
            />
          </View>

          {reduction !== null && (
            reduction > 0 ? (
              <ResultBanner text={`You could save ${reduction.toFixed(2)} kgCO₂e`} />
            ) : reduction < 0 ? (
              <ResultBanner
                tone="warning"
                text={`Warning: +${Math.abs(reduction).toFixed(2)} kgCO₂e more`}
              />
            ) : (
              <ResultBanner tone="neutral" text="No carbon reduction." />
            )
          )}
        </Card>

        {/* Electricity comparison */}
        <Card icon="flash-outline" title="Electricity Usage (Monthly)">
          <LabeledInput
            label="Last Month"
            value={electricLastMonth}
            onChangeText={setElectricLastMonth}
            placeholder="e.g., 250"
            suffix="kWh"
          />
          <LabeledInput
            label="This Month"
            value={electricThisMonth}
            onChangeText={setElectricThisMonth}
            placeholder="e.g., 210"
            suffix="kWh"
          />

          {/* Action row: Compare + Save (same rule) */}
          <View style={styles.actionsRow}>
            <PrimaryButton title="Compare Reduction" onPress={handleElectricReduction} />
            <PrimaryButton
              title="Save"
              onPress={handleElectricSave}
              style={{ backgroundColor: theme.primaryDark }}
            />
          </View>

          {electricReduction !== null && (
            electricReduction > 0 ? (
              <ResultBanner text={`${electricReduction.toFixed(2)} kgCO₂e saved`} />
            ) : electricReduction < 0 ? (
              <ResultBanner
                tone="warning"
                text={`You emitted +${Math.abs(electricReduction).toFixed(2)} kgCO₂e more`}
              />
            ) : (
              <ResultBanner tone="neutral" text="No carbon reduction." />
            )
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: theme.primaryDark },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text },

  label: { color: theme.sub, fontSize: 13, marginBottom: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFF' },

  inputWrap: { position: 'relative', borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: '#FFF' },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: theme.text },
  suffix: {
    position: 'absolute', right: 8, top: 8, bottom: 8, borderRadius: 10,
    paddingHorizontal: 10, justifyContent: 'center', backgroundColor: '#F3F4F6',
  },
  suffixText: { color: theme.sub, fontWeight: '600', fontSize: 12 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  resultWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: { fontWeight: '700' },

  divider: { height: 1, backgroundColor: theme.border, marginVertical: 14 },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
