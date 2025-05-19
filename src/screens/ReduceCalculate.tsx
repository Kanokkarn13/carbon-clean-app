import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { calculateEmission, emissionData } from '../hooks/calculateEmission';

const ReduceCarbonScreen = () => {
  const navigation = useNavigation();

  const [fromVehicle, setFromVehicle] = useState('Car');
  const [fromFuel, setFromFuel] = useState('Petrol');
  const [fromSize, setFromSize] = useState('Small car');
  const [toVehicle, setToVehicle] = useState('Bus');
  const [toSize, setToSize] = useState('Average local bus');
  const [toFuel, setToFuel] = useState('');
  const [distance, setDistance] = useState('');
  const [reduction, setReduction] = useState(null);

  const [electricLastMonth, setElectricLastMonth] = useState('');
  const [electricThisMonth, setElectricThisMonth] = useState('');
  const [electricReduction, setElectricReduction] = useState(null);

  const handleCalculate = () => {
    const dist = parseFloat(distance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid distance.');
      return;
    }

    const fromEmission = calculateEmission(
      fromVehicle === 'Car' ? fromFuel : fromVehicle,
      fromSize,
      dist
    );

    const toEmission = calculateEmission(
      toVehicle === 'Car' ? toFuel : toVehicle,
      toSize,
      dist
    );

    if (typeof fromEmission !== 'number' || typeof toEmission !== 'number') {
      Alert.alert('Calculation Error', 'Emission calculation returned invalid values.');
      return;
    }

    const diff = fromEmission - toEmission;
    setReduction(diff);
  };

  const handleElectricReduction = () => {
    const last = parseFloat(electricLastMonth);
    const current = parseFloat(electricThisMonth);
    if (isNaN(last) || isNaN(current) || last <= 0 || current <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid kWh values for both months.');
      return;
    }
    const emissionFactor = 0.233;
    const lastEmission = last * emissionFactor;
    const currentEmission = current * emissionFactor;
    const diff = lastEmission - currentEmission;
    setElectricReduction(diff);
  };

  const getVehicleClasses = (vehicle, fuel) => {
    if (vehicle === 'Car') {
      return emissionData[fuel] ? Object.keys(emissionData[fuel]) : [];
    }
    return emissionData[vehicle] ? Object.keys(emissionData[vehicle]) : [];
  };

  const vehicleOptions = ['Car', 'Motorbike', 'Bus', 'Taxis'];
  const fuelOptions = ['Petrol', 'Diesel', 'Hybrid', 'Unknown'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingTop: 30 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0db760" />
        </TouchableOpacity>
        <Text style={styles.title}>Reduce Carbon</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle You Normally Use</Text>
        <Picker selectedValue={fromVehicle} onValueChange={(value) => {
          setFromVehicle(value);
          if (value === 'Car') {
            setFromFuel('Petrol');
            setFromSize(getVehicleClasses('Car', 'Petrol')[0]);
          } else {
            setFromFuel('');
            const classes = getVehicleClasses(value, '');
            if (classes.length > 0) setFromSize(classes[0]);
          }
        }} style={styles.picker}>
          {vehicleOptions.map((vehicle) => (
            <Picker.Item key={vehicle} label={vehicle} value={vehicle} />
          ))}
        </Picker>
        {fromVehicle === 'Car' && (
          <Picker selectedValue={fromFuel} onValueChange={(value) => {
            setFromFuel(value);
            const classes = getVehicleClasses('Car', value);
            if (classes.length > 0) setFromSize(classes[0]);
          }} style={styles.picker}>
            {fuelOptions.map((fuel) => (
              <Picker.Item key={fuel} label={fuel} value={fuel} />
            ))}
          </Picker>
        )}
        <Picker selectedValue={fromSize} onValueChange={(value) => setFromSize(value)} style={styles.picker}>
          {getVehicleClasses(fromVehicle, fromFuel).map((className) => (
            <Picker.Item key={className} label={className} value={className} />
          ))}
        </Picker>

        <Text style={styles.sectionTitle}>Vehicle You Switch To</Text>
        <Picker selectedValue={toVehicle} onValueChange={(value) => {
          setToVehicle(value);
          if (value === 'Car') {
            setToFuel('Petrol');
            setToSize(getVehicleClasses('Car', 'Petrol')[0]);
          } else {
            setToFuel('');
            const classes = getVehicleClasses(value, '');
            if (classes.length > 0) setToSize(classes[0]);
          }
        }} style={styles.picker}>
          {vehicleOptions.map((vehicle) => (
            <Picker.Item key={vehicle} label={vehicle} value={vehicle} />
          ))}
        </Picker>
        {toVehicle === 'Car' && (
          <Picker selectedValue={toFuel} onValueChange={(value) => {
            setToFuel(value);
            const classes = getVehicleClasses('Car', value);
            if (classes.length > 0) setToSize(classes[0]);
          }} style={styles.picker}>
            {fuelOptions.map((fuel) => (
              <Picker.Item key={fuel} label={fuel} value={fuel} />
            ))}
          </Picker>
        )}
        <Picker selectedValue={toSize} onValueChange={(value) => setToSize(value)} style={styles.picker}>
          {getVehicleClasses(toVehicle, toFuel).map((className) => (
            <Picker.Item key={className} label={className} value={className} />
          ))}
        </Picker>

        <TextInput
          style={styles.input}
          placeholder="Distance (km)"
          keyboardType="numeric"
          value={distance}
          onChangeText={setDistance}
        />

        <TouchableOpacity style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate Reduction</Text>
        </TouchableOpacity>

        {reduction !== null && (
          <Text style={styles.result}>
            {reduction > 0
              ? `You could save ${reduction.toFixed(2)} kgCO₂e`
              : reduction < 0
              ? `Warning: Your new vehicle emits ${(Math.abs(reduction)).toFixed(2)} kgCO₂e more.`
              : 'No carbon reduction.'}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Electricity Usage (Monthly)</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Month (kWh)"
          keyboardType="numeric"
          value={electricLastMonth}
          onChangeText={setElectricLastMonth}
        />
        <TextInput
          style={styles.input}
          placeholder="This Month (kWh)"
          keyboardType="numeric"
          value={electricThisMonth}
          onChangeText={setElectricThisMonth}
        />
        <TouchableOpacity style={styles.button} onPress={handleElectricReduction}>
          <Text style={styles.buttonText}>Compare Reduction</Text>
        </TouchableOpacity>
        {electricReduction !== null && (
          <Text style={styles.result}>
            {electricReduction > 0
              ? `${electricReduction.toFixed(2)} kgCO₂e saved`
              : electricReduction < 0
              ? `Warning: You emitted ${(Math.abs(electricReduction)).toFixed(2)} kgCO₂e more`
              : 'No carbon reduction.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0db760',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0db760',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    borderRadius: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0db760',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  result: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0db760',
    textAlign: 'center',
  },
});

export default ReduceCarbonScreen;
