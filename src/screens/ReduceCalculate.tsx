import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReduceCalculateScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={24} color="#0db760" />
        <Text style={styles.headerTitle}>Reduce Carbon</Text>
      </View>

      {/* Household Summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Household</Text>
        <View style={styles.rowBetween}>
          <View style={styles.personRow}>
            <Ionicons name="person" size={20} color="#000" />
            <Text style={styles.personCount}>1</Text>
          </View>
          <View>
            <Text style={styles.lastMonth}>Last month  0.50 kgCO2e</Text>
            <Text style={styles.thisMonth}>This month  <Text style={styles.greenText}>0.33 kgCO2e</Text></Text>
          </View>
        </View>
      </View>

      {/* Reducing Cards */}
      {[1, 2].map((_, index) => (
        <View key={index} style={styles.reducingBox}>
          <Text style={styles.subTitle}>Add Reducing</Text>
          <View style={styles.transportRow}>
            <Ionicons name="car" size={28} color="#000" />
            <Ionicons name="arrow-forward" size={20} color="#999" style={{ marginHorizontal: 16 }} />
            <Ionicons name="airplane" size={28} color="#000" />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionColumn}>
              <Text style={styles.label}>Fuel</Text>
              <View style={styles.dropdownPlaceholder} />
              <Text style={styles.label}>Size</Text>
              <View style={styles.dropdownPlaceholder} />
              <Text style={styles.label}>Distance</Text>
              <View style={styles.dropdownPlaceholder} />
            </View>
            <View style={styles.optionColumn}>
              <Text style={styles.label}>Flight</Text>
              <View style={styles.dropdownPlaceholder} />
              <Text style={styles.label}>Class</Text>
              <View style={styles.dropdownPlaceholder} />
              <Text style={styles.label}>Distance</Text>
              <View style={styles.dropdownPlaceholder} />
            </View>
          </View>
          <Text style={styles.reductionText}>Carbon Reduction  1.56 kgCO2e</Text>
        </View>
      ))}

      {/* Space */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: '#000' },
  summaryBox: { backgroundColor: '#f4fff7', padding: 16, borderRadius: 12, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#0db760', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center' },
  personCount: { marginLeft: 4, fontSize: 16 },
  lastMonth: { fontSize: 12, color: '#999' },
  thisMonth: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  greenText: { color: '#0db760' },
  reducingBox: { backgroundColor: '#f4fff7', padding: 16, borderRadius: 12, marginBottom: 16 },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#0db760', marginBottom: 10 },
  transportRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  optionColumn: { width: '48%' },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  dropdownPlaceholder: {
    height: 32,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  reductionText: { marginTop: 12, fontSize: 14, color: '#0db760', fontWeight: 'bold' },
});

export default ReduceCalculateScreen;
