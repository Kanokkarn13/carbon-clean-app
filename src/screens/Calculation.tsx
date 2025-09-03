import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

// Turn off after verifying
const __DEBUG = true;

function parsePositiveInt(v: unknown): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return undefined;
}

function getMembersFrom(obj: any): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const candidates = [
    'house_member',   // snake_case
    'House_member',   // as in your DB screenshot
    'houseMember',    // camelCase
    'members',
    'member_count',
  ];
  for (const key of candidates) {
    const parsed = parsePositiveInt(obj?.[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

const Calculation = ({ navigation }: any) => {
  const route = useRoute<any>();
  const params = route?.params || {};
  const user = params?.user || {};

  // Prefer user param, then top-level params, else default 1
  const members = getMembersFrom(user) ?? getMembersFrom(params) ?? 1;

  if (__DEBUG) {
    console.log('CALCULATION_DEBUG -> route.params:', params);
    console.log('CALCULATION_DEBUG -> user:', user);
    console.log(
      'CALCULATION_DEBUG -> parsed members:',
      members,
      'typeof(user.House_member)=',
      typeof user?.House_member,
      'value=',
      user?.House_member
    );
    console.log(
      'CALCULATION_DEBUG -> typeof(params.house_member)=',
      typeof params?.house_member,
      'value=',
      params?.house_member
    );
  }

  const peopleLabel = `${members} person${members === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emission</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Optional on-screen debug */}
      {__DEBUG && (
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>DEBUG</Text>
          <Text style={styles.debugLine}>user.House_member: {String(user?.House_member)}</Text>
          <Text style={styles.debugLine}>user.house_member: {String(user?.house_member)}</Text>
          <Text style={styles.debugLine}>params.house_member: {String(params?.house_member)}</Text>
          <Text style={styles.debugLine}>members USED: {members}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card 1 — Calculate Emission */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.push('EmissonCalculate')}
        >
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardTitle}>Calculate</Text>
              <Text style={styles.cardTitle}>Emission</Text>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="cloudy-outline" size={28} color={theme.primaryDark} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Ionicons name="person-outline" size={14} color={theme.primaryDark} />
              <Text style={styles.chipText}>{peopleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Emission</Text>
            <Text style={styles.valueBold}>0.00 kgCO₂e</Text>
          </View>
        </TouchableOpacity>

        {/* Card 2 — Reduce Carbon */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.push('ReduceCalculate')}
        >
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardTitle}>Reduce</Text>
              <Text style={styles.cardTitle}>Carbon</Text>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="leaf-outline" size={28} color={theme.primaryDark} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Ionicons name="person-outline" size={14} color={theme.primaryDark} />
              <Text style={styles.chipText}>{peopleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelMuted}>Last month</Text>
              <Text style={styles.valueMuted}>0.00 kgCO₂e</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>This month</Text>
              <Text style={styles.valueGreen}>0.00 kgCO₂e</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Calculation;

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerSide: { width: 28, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },

  debugBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  debugTitle: { fontWeight: '800', marginBottom: 6, color: '#92400E' },
  debugLine: { fontSize: 12, color: '#92400E' },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: theme.primaryDark, lineHeight: 26 },

  metaRow: { flexDirection: 'row', marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipText: { color: theme.primaryDark, fontWeight: '700' },

  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 14, color: theme.text, fontWeight: '700' },
  labelMuted: { fontSize: 13, color: theme.sub, fontWeight: '700' },

  valueBold: { fontSize: 16, fontWeight: '800', color: theme.text },
  valueMuted: { fontSize: 14, color: theme.sub, fontWeight: '600', marginTop: 2 },
  valueGreen: { fontSize: 16, fontWeight: '800', color: theme.primaryDark },
});
