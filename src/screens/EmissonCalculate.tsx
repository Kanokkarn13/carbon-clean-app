import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { calculateEmission } from '../hooks/calculateEmission';

const theme = {
  green: '#10B981',       // primary
  greenDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
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
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
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
          keyboardType={keyboardType}
          placeholderTextColor={theme.sub}
        />
        {suffix ? <View style={styles.suffix}><Text style={styles.suffixText}>{suffix}</Text></View> : null}
      </View>
    </View>
  );
}

function Section({
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
        <Ionicons name={icon} size={18} color={theme.green} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.primaryBtn} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
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



export default function EmissionCalculate() {
  const navigation = useNavigation();

  // Car
  const [fuel, setFuel] = useState<'Unknown' | 'Petrol' | 'Diesel' | 'Hybrid'>('Unknown');
  const [size, setSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [distance, setDistance] = useState('');
  const [result, setResult] = useState<string | null>(null);

  // Motorcycle
  const [motorcycleSize, setMotorcycleSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [motorcycleDistance, setMotorcycleDistance] = useState('');
  const [motorcycleResult, setMotorcycleResult] = useState<string | null>(null);

  // Taxi
  const [taxiDistance, setTaxiDistance] = useState('');
  const [taxiResult, setTaxiResult] = useState<string | null>(null);

  // Bus
  const [busDistance, setBusDistance] = useState('');
  const [busResult, setBusResult] = useState<string | null>(null);

  const parseKm = (v: string) => {
    const dist = parseFloat(v);
    if (isNaN(dist) || dist <= 0) return null;
    return dist;
  };

  const handleCalculate = () => {
    const dist = parseKm(distance);
    if (dist == null) return Alert.alert('Invalid distance', 'Please enter a positive number.');
    const emission = calculateEmission(fuel, `${size} car`, dist);
    setResult(`${emission} kgCO₂e`);
  };

  const handleMotorcycle = () => {
    const dist = parseKm(motorcycleDistance);
    if (dist == null) return Alert.alert('Invalid distance', 'Please enter a positive number.');
    const emission = calculateEmission('Motorbike', motorcycleSize, dist);
    setMotorcycleResult(`${emission} kgCO₂e`);
  };

  const handleTaxi = () => {
    const dist = parseKm(taxiDistance);
    if (dist == null) return Alert.alert('Invalid distance', 'Please enter a positive number.');
    const emission = calculateEmission('Taxis', 'Regular taxi', dist);
    setTaxiResult(`${emission} kgCO₂e`);
  };

  const handleBus = () => {
    const dist = parseKm(busDistance);
    if (dist == null) return Alert.alert('Invalid distance', 'Please enter a positive number.');
    const emission = calculateEmission('Bus', 'Average local bus', dist);
    setBusResult(`${emission} kgCO₂e`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
            <ChipGroup
              options={['Unknown', 'Petrol', 'Diesel', 'Hybrid']}
              value={fuel}
              onChange={v => setFuel(v as any)}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Size</Text>
            <ChipGroup
              options={['Small', 'Medium', 'Large']}
              value={size}
              onChange={v => setSize(v as any)}
            />

            <LabeledInput
              label="Distance"
              value={distance}
              onChangeText={setDistance}
              placeholder="e.g., 12.5"
              keyboardType="numeric"
              suffix="km"
            />

            <PrimaryButton title="Calculate" onPress={handleCalculate} />
            <ResultBadge value={result} />
          </Section>

          {/* Motorcycle */}
          <Section icon="bicycle-outline" title="Motorcycle">
            <Text style={styles.label}>Motorcycle Size</Text>
            <ChipGroup
              options={['Small', 'Medium', 'Large']}
              value={motorcycleSize}
              onChange={v => setMotorcycleSize(v as any)}
            />
            <LabeledInput
              label="Distance"
              value={motorcycleDistance}
              onChangeText={setMotorcycleDistance}
              placeholder="e.g., 7"
              keyboardType="numeric"
              suffix="km"
            />
            <PrimaryButton title="Calculate" onPress={handleMotorcycle} />
            <ResultBadge value={motorcycleResult} />
          </Section>

          {/* Taxi */}
          <Section icon="car-sport-outline" title="Taxi">
            <LabeledInput
              label="Distance"
              value={taxiDistance}
              onChangeText={setTaxiDistance}
              placeholder="e.g., 15"
              keyboardType="numeric"
              suffix="km"
            />
            <PrimaryButton title="Calculate" onPress={handleTaxi} />
            <ResultBadge value={taxiResult} />
          </Section>

          {/* Bus */}
          <Section icon="bus-outline" title="Bus">
            <LabeledInput
              label="Distance"
              value={busDistance}
              onChangeText={setBusDistance}
              placeholder="e.g., 22"
              keyboardType="numeric"
              suffix="km"
            />
            <PrimaryButton title="Calculate" onPress={handleBus} />
            <ResultBadge value={busResult} />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '700',
    color: theme.greenDark,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontWeight: '700',
    color: theme.text,
    fontSize: 16,
  },
  label: {
    color: theme.sub,
    fontSize: 13,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: theme.green,
    borderColor: theme.green,
  },
  chipText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFF',
  },
  inputWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.text,
  },
  suffix: {
    position: 'absolute',
    right: 8,
    top: 8,
    bottom: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  suffixText: {
    color: theme.sub,
    fontWeight: '600',
    fontSize: 12,
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: theme.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resultBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  resultText: {
    color: theme.greenDark,
    fontWeight: '700',
  },
});
