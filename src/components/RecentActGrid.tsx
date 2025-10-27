// src/screens/RecentActGrid.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RecentActCard from '../components/RecentActCard';
import { Ionicons } from '@expo/vector-icons';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  text: '#0B1721',
  sub: '#6B7280',
};

export default function RecentActGrid({ navigation, route }: any) {
  const activities = route.params?.activities ?? [];
  const [page, setPage] = useState(0);

  const perPage = 5;
  const paginated = activities.slice(page * perPage, page * perPage + perPage);
  const totalPages = Math.ceil(activities.length / perPage);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Recent Activities</Text>

      <FlatList
        data={paginated}
        numColumns={2}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item }) => (
          <RecentActCard
            item={item}
            onPress={() => navigation.navigate('RecentAct', { activity: item })}
          />
        )}
        contentContainerStyle={styles.grid}
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page === 0}
            onPress={() => setPage((p) => p - 1)}
            style={[styles.pageBtn, page === 0 && { opacity: 0.5 }]}
          >
            <Ionicons name="chevron-back" size={18} color={theme.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.pageText}>{page + 1} / {totalPages}</Text>
          <TouchableOpacity
            disabled={page >= totalPages - 1}
            onPress={() => setPage((p) => p + 1)}
            style={[styles.pageBtn, page >= totalPages - 1 && { opacity: 0.5 }]}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.primaryDark} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 12 },
  header: { fontWeight: '800', fontSize: 18, color: theme.text, marginBottom: 10, textAlign: 'center' },
  grid: { paddingBottom: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  pageBtn: { padding: 8 },
  pageText: { color: theme.sub, fontWeight: '700', marginHorizontal: 8 },
});
