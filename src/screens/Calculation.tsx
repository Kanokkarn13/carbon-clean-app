import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const Calculation = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#00AA55" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emission</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card 1 */}
        <TouchableOpacity style={styles.cardBox} onPress={() => navigation.push('EmissonCalculate')}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardTitle}>Calculate</Text>
              <Text style={styles.cardTitle}>Emission</Text>
            </View>
            <FontAwesome5 name="home" size={52} color="black" />
          </View>
          <Text style={styles.subLabel}>1 people</Text>
          <View style={styles.cardRowBetween}>
            <Text style={styles.label}>Emission</Text>
            <Text style={styles.valueBold}>0.00 kgCO₂e</Text>
          </View>
        </TouchableOpacity>

        {/* Card 2 */}
        <TouchableOpacity style={styles.cardBox} onPress={() => navigation.push('ReduceCalculate')}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardTitle}>Reduce</Text>
              <Text style={styles.cardTitle}>Carbon</Text>
            </View>
            <FontAwesome5 name="user" size={52} color="black" />
          </View>
          <Text style={styles.bigNum}>1</Text>
          <View style={styles.cardRowBetween}>
            <View>
              <Text style={styles.labelGray}>Last month</Text>
              <Text style={styles.valueGray}>0.00 kgCO₂e</Text>
            </View>
            <View>
              <Text style={styles.label}>This month</Text>
              <Text style={styles.valueGreen}>0.00 kgCO₂e</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingBottom: 40,
  },
  cardBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00AA55',
    lineHeight: 28,
  },
  subLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  labelGray: {
    fontSize: 14,
    color: '#aaa',
  },
  valueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  valueGray: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  valueGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00AA55',
  },
  bigNum: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    textAlign: 'left',
  },
});

export default Calculation;