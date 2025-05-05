
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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { calculateEmission } from '../hooks/calculateEmission';

export default function EmissionCalculate() {
  const navigation = useNavigation();
  const [fuel, setFuel] = useState('Unknown');
  const [size, setSize] = useState('Small');
  const [distance, setDistance] = useState('');
  const [result, setResult] = useState(null);

  const [motorcycleSize, setMotorcycleSize] = useState('Small');
  const [motorcycleDistance, setMotorcycleDistance] = useState('');
  const [motorcycleResult, setMotorcycleResult] = useState(null);

  const [taxiDistance, setTaxiDistance] = useState('');
  const [taxiResult, setTaxiResult] = useState(null);

  const [busDistance, setBusDistance] = useState('');
  const [busResult, setBusResult] = useState(null);

  const handleCalculate = () => {
    const dist = parseFloat(distance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Please enter a valid distance.');
      return;
    }
    const emission = calculateEmission(fuel, `${size} car`, dist);
    setResult(`${emission} kgCO₂e`);
  };

  const handleMotorcycle = () => {
    const dist = parseFloat(motorcycleDistance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Please enter a valid distance.');
      return;
    }
    const emission = calculateEmission('Motorbike', motorcycleSize, dist);
    setMotorcycleResult(`${emission} kgCO₂e`);
  };

  const handleTaxi = () => {
    const dist = parseFloat(taxiDistance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Please enter a valid distance.');
      return;
    }
    const emission = calculateEmission('Taxis', 'Regular taxi', dist);
    setTaxiResult(`${emission} kgCO₂e`);
  };

  const handleBus = () => {
    const dist = parseFloat(busDistance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Please enter a valid distance.');
      return;
    }
    const emission = calculateEmission('Bus', 'Average local bus', dist);
    setBusResult(`${emission} kgCO₂e`);
  };

  const Section = ({ icon, title, children }) => (
    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={icon} size={20} color="#0db760" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0db760' }}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#0db760" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0db760', marginLeft: 10 }}>
              Emission Calculate
            </Text>
          </View>

          {/* Car Section */}
          <Section icon="car-outline" title="Car">
            <Text style={{ marginBottom: 4 }}>Fuel Type</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 8 }}>
              <Picker selectedValue={fuel} onValueChange={setFuel} mode="dropdown">
                <Picker.Item label="Unknown" value="Unknown" />
                <Picker.Item label="Petrol" value="Petrol" />
                <Picker.Item label="Diesel" value="Diesel" />
                <Picker.Item label="Hybrid" value="Hybrid" />
              </Picker>
            </View>

            <Text style={{ marginBottom: 4 }}>Vehicle Size</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 8 }}>
              <Picker selectedValue={size} onValueChange={setSize} mode="dropdown">
                <Picker.Item label="Small" value="Small" />
                <Picker.Item label="Medium" value="Medium" />
                <Picker.Item label="Large" value="Large" />
              </Picker>
            </View>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
              placeholder="Distance (km)"
              value={distance}
              keyboardType="numeric"
              onChangeText={setDistance}
            />

            <TouchableOpacity onPress={handleCalculate} style={{
              backgroundColor: '#0db760',
              borderRadius: 8,
              padding: 12,
              marginTop: 10,
              alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calculate</Text>
            </TouchableOpacity>
            {result && <Text style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold', color: '#0db760' }}>{result}</Text>}
          </Section>

          {/* Motorcycle Section */}
          <Section icon="bicycle-outline" title="Motorcycle">
            <Text style={{ marginBottom: 4 }}>Motorcycle Size</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 8 }}>
              <Picker selectedValue={motorcycleSize} onValueChange={setMotorcycleSize} mode="dropdown">
                <Picker.Item label="Small" value="Small" />
                <Picker.Item label="Medium" value="Medium" />
                <Picker.Item label="Large" value="Large" />
              </Picker>
            </View>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
              placeholder="Distance (km)"
              value={motorcycleDistance}
              keyboardType="numeric"
              onChangeText={setMotorcycleDistance}
            />
            <TouchableOpacity onPress={handleMotorcycle} style={{
              backgroundColor: '#0db760',
              borderRadius: 8,
              padding: 12,
              marginTop: 10,
              alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calculate</Text>
            </TouchableOpacity>
            {motorcycleResult && <Text style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold', color: '#0db760' }}>{motorcycleResult}</Text>}
          </Section>

          {/* Taxi Section */}
          <Section icon="car-sport-outline" title="Taxi">
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
              placeholder="Taxi Distance (km)"
              value={taxiDistance}
              keyboardType="numeric"
              onChangeText={setTaxiDistance}
            />
            <TouchableOpacity onPress={handleTaxi} style={{
              backgroundColor: '#0db760',
              borderRadius: 8,
              padding: 12,
              marginTop: 10,
              alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calculate Taxi</Text>
            </TouchableOpacity>
            {taxiResult && <Text style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold', color: '#0db760' }}>{taxiResult}</Text>}
          </Section>

          {/* Bus Section */}
          <Section icon="bus-outline" title="Bus">
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
              placeholder="Bus Distance (km)"
              value={busDistance}
              keyboardType="numeric"
              onChangeText={setBusDistance}
            />
            <TouchableOpacity onPress={handleBus} style={{
              backgroundColor: '#0db760',
              borderRadius: 8,
              padding: 12,
              marginTop: 10,
              alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calculate Bus</Text>
            </TouchableOpacity>
            {busResult && <Text style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold', color: '#0db760' }}>{busResult}</Text>}
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
