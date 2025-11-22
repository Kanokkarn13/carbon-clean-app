import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import RecentActCard, { Activity } from './RecentActCard';

export type ActivityType = 'Cycling' | 'Walking';

type Props = {
  title?: string;
  activities: Activity[] | undefined | null;
  loading?: boolean;
  onItemPress?: (a: Activity) => void;
  pageSize?: number;
};

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
};

function toTime(a: Activity): number {
  const raw =
    (a as any)?.record_date ??
    (a as any)?.created_at ??
    (a as any)?.updated_at ??
    (a as any)?.date ??
    null;
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function RecentActivityList({
  title = 'Recent Activity',
  activities,
  loading,
  onItemPress,
  pageSize = 5,
}: Props) {
  const list = Array.isArray(activities) ? activities : [];

  const sorted = useMemo(() => {
    const clone = [...list];
    clone.sort((a, b) => toTime(b) - toTime(a));
    return clone;
  }, [list]);

  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [sorted.length, size]);

  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * size;
  const currentItems = sorted.slice(start, start + size);

  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="leaf-outline" size={18} color={theme.sub} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {currentItems.map((a, i) => {
            const id = a.id ?? 'na';
            const dt = a.record_date ?? 'none';
            const ttl = a.title ?? 'untitled';
            const key = `${id}-${dt}-${ttl}-${start + i}`;
            return <RecentActCard key={key} activity={a} onPress={onItemPress} />;
          })}

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.navButton, !canPrev && styles.navButtonDisabled]}
                onPress={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                disabled={!canPrev}
              >
                <Text style={[styles.navLabel, !canPrev && styles.navLabelDisabled]}>{'<'}</Text>
              </TouchableOpacity>

              <View style={styles.pageList}>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const isActive = idx === currentPage;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.pageNumberWrap,
                        isActive && styles.pageNumberWrapActive,
                      ]}
                      onPress={() => setPage(idx)}
                      disabled={isActive}
                    >
                      <Text
                        style={[
                          styles.pageNumber,
                          isActive && styles.pageNumberActive,
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.navButton, !canNext && styles.navButtonDisabled]}
                onPress={() => canNext && setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={!canNext}
              >
                <Text style={[styles.navLabel, !canNext && styles.navLabelDisabled]}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },

  loadingBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  loadingText: { color: theme.sub },

  emptyBox: { paddingVertical: 16, alignItems: 'center', gap: 6 },
  emptyText: { color: theme.sub },

  pagination: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  navButtonDisabled: {
    borderColor: theme.border,
    backgroundColor: '#F4F6F5',
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.primaryDark,
  },
  navLabelDisabled: {
    color: theme.sub,
  },
  pageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberWrap: {
    minWidth: 32,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  pageNumberWrapActive: {
    borderColor: theme.primaryDark,
    backgroundColor: '#ECFDF5',
  },
  pageNumber: {
    fontWeight: '700',
    color: theme.text,
    fontSize: 14,
  },
  pageNumberActive: {
    color: theme.primaryDark,
  },
});
