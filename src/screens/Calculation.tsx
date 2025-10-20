import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { useCalculationData } from '../hooks/useCalculationData';
import EmissionCard from '../components/EmissionCard';
import ReductionCard from '../components/ReductionCard';
import type { SavedRow, ReductionRow } from '../types/calc';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626',
};

const Calculation = ({ navigation }: any) => {
  const route = useRoute<any>();

  const {
    user,
    peopleLabel,

    openSaved, setOpenSaved,
    loading, savingError, items, refreshing, totalEmission, onRefresh,

    openReduce, setOpenReduce,
    loadingReduce, reduceError, reduceItems, refreshingReduce, totalReduction, onRefreshReduce,
  } = useCalculationData(route?.params?.user, route?.params);

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          openSaved
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            : openReduce
            ? <RefreshControl refreshing={refreshingReduce} onRefresh={onRefreshReduce} />
            : undefined
        }
      >
        {/* Emission Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Calculate</Text>
              <Text style={styles.cardTitle}>Emission</Text>
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
            <Text style={[styles.valueBold, styles.valueDanger]}>
              {totalEmission.toFixed(2)} kgCO₂e
            </Text>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.goBtn}
              activeOpacity={0.9}
              onPress={() => navigation.push('EmissonCalculate', { user })}
            >
              <Ionicons name="calculator-outline" size={18} color="#FFF" />
              <Text style={styles.goBtnText}>Open Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              activeOpacity={0.8}
              onPress={() => setOpenSaved((s: boolean) => !s)}
            >
              <Text style={styles.toggleText}>Saved</Text>
              <Ionicons
                name={openSaved ? 'chevron-down-outline' : 'chevron-forward-outline'}
                size={20}
                color={theme.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {openSaved && (
            <View style={styles.savedWrap}>
              <View style={styles.savedRowHeader}>
                <Text style={styles.savedTitle}>Saved Emission Activities</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.rowRefresh} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={16} color={theme.primaryDark} />
                  <Text style={styles.rowRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : savingError ? (
                <Text style={styles.errorText}>{savingError}</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>No saved items yet</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedScroller}
                >
                  {items.map((row: SavedRow) => (
                    <EmissionCard key={row.id} item={row} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Reduction Card */}
        <View style={styles.card}>
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
            <Text style={styles.label}>Total Saved</Text>
            <Text style={styles.valueGreen}>{totalReduction.toFixed(2)} kgCO₂e</Text>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.goBtn}
              activeOpacity={0.9}
              onPress={() => navigation.push('ReduceCalculate', { user })}
            >
              <Ionicons name="swap-vertical" size={18} color="#FFF" />
              <Text style={styles.goBtnText}>Open Reducer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              activeOpacity={0.8}
              onPress={() => setOpenReduce((s: boolean) => !s)}
            >
              <Text style={styles.toggleText}>Saved</Text>
              <Ionicons
                name={openReduce ? 'chevron-down-outline' : 'chevron-forward-outline'}
                size={20}
                color={theme.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {openReduce && (
            <View style={styles.savedWrap}>
              <View style={styles.savedRowHeader}>
                <Text style={styles.savedTitle}>Saved Reductions</Text>
                <TouchableOpacity onPress={onRefreshReduce} style={styles.rowRefresh} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={16} color={theme.primaryDark} />
                  <Text style={styles.rowRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loadingReduce ? (
                <View style={styles.center}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : reduceError ? (
                <Text style={styles.errorText}>{reduceError}</Text>
              ) : reduceItems.length === 0 ? (
                <Text style={styles.emptyText}>No reductions saved yet</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedScroller}
                >
                  {reduceItems.map((row: ReductionRow) => (
                    <ReductionCard key={row.id} item={row} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
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

  valueBold: { fontSize: 16, fontWeight: '800', color: theme.text },
  valueGreen: { fontSize: 16, fontWeight: '800', color: theme.primaryDark },
  valueDanger: { color: theme.danger },

  ctaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  goBtnText: { color: '#FFF', fontWeight: '800' },

  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleText: { color: theme.primaryDark, fontWeight: '800' },

  savedWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  savedRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  savedTitle: { fontSize: 16, fontWeight: '800', color: theme.text },

  rowRefresh: {
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
  rowRefreshText: { color: theme.primaryDark, fontWeight: '700', fontSize: 12 },

  center: { paddingVertical: 10, alignItems: 'center' },
  loadingText: { marginTop: 6, color: theme.sub, fontSize: 12 },
  errorText: { color: '#B91C1C', fontWeight: '700' },
  emptyText: { color: theme.sub, fontWeight: '600' },

  savedScroller: { paddingVertical: 6, gap: 12 },
});
