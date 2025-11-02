import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from './HomeStack';
import { Redemption, RedemptionStatus } from '../services/rewardService';

type Props = NativeStackScreenProps<RootStackParamList, 'RedeemHistoryDetail'>;

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

const STATUS_META: Record<
  RedemptionStatus,
  { label: string; tint: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: {
    label: 'Approved',
    tint: '#DCFCE7',
    color: '#15803D',
    icon: 'checkmark-circle',
  },
  pending: {
    label: 'Pending Review',
    tint: '#FEF3C7',
    color: '#B45309',
    icon: 'time',
  },
  rejected: {
    label: 'Rejected',
    tint: '#FEE2E2',
    color: '#B91C1C',
    icon: 'close-circle',
  },
  cancelled: {
    label: 'Cancelled',
    tint: '#E5E7EB',
    color: '#4B5563',
    icon: 'remove-circle',
  },
};

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function renderInfoRow(label: string, value: string | number | null | undefined) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '-'}</Text>
    </View>
  );
}

const RedeemHistoryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const redemption = route.params?.redemption as Redemption | undefined;
  if (!redemption) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={22} color={theme.danger} />
          <Text style={styles.errorBoxText}>Redemption details are missing.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[redemption.status] ?? STATUS_META.pending;

  const rewardTitle = redemption.reward_title || `Reward #${redemption.reward_id ?? '-'}`;
  const rewardDescription =
    redemption.reward_description || 'No description available for this reward.';

  const summaryStats = useMemo(
    () => [
      {
        label: 'Points used',
        value: redemption.cost_points.toLocaleString(),
        icon: 'sparkles-outline',
      },
      {
        label: 'Reward points value',
        value:
          redemption.reward_cost_points != null
            ? redemption.reward_cost_points.toLocaleString()
            : '—',
        icon: 'pricetag-outline',
      },
      {
        label: 'Redeemed on',
        value: formatDate(redemption.created_at),
        icon: 'time-outline',
      },
    ],
    [redemption]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redeem Detail</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroOverline}>Reward Redemption</Text>
            <Text style={styles.heroTitle}>{rewardTitle}</Text>
            <Text style={styles.heroSubtitle}>{rewardDescription}</Text>

            <View style={[styles.statusBadge, { backgroundColor: meta.tint }]}>
              <Ionicons
                name={meta.icon}
                size={16}
                color={meta.color}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>

          {redemption?.reward_image_url ? (
            <Image
              source={{ uri: redemption.reward_image_url }}
              style={styles.heroImage}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Ionicons name="gift-outline" size={28} color={theme.primaryDark} />
            </View>
          )}
        </View>

        <View style={styles.summaryStrip}>
          {summaryStats.map((stat) => (
            <View key={stat.label} style={styles.summaryItem}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name={stat.icon as any} size={16} color={theme.primaryDark} />
              </View>
              <Text style={styles.summaryLabel}>{stat.label}</Text>
              <Text style={styles.summaryValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redemption Details</Text>
          <View style={styles.infoCard}>
            {renderInfoRow('Redemption ID', redemption.id ?? '-')}
            {renderInfoRow('Reward ID', redemption.reward_id ?? '-')}
            {renderInfoRow('Status', meta.label)}
            {renderInfoRow('Points Used', `${redemption.cost_points.toLocaleString()} pts`)}
            {renderInfoRow(
              'Reward Value',
              redemption.reward_cost_points != null
                ? `${redemption.reward_cost_points.toLocaleString()} pts`
                : '—'
            )}
            {renderInfoRow('Redeemed On', formatDate(redemption.created_at))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Summary</Text>
          <View style={styles.rewardCard}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={theme.sub}
              style={{ marginTop: 2 }}
            />
            <Text style={styles.rewardCardText}>{rewardDescription}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  headerSpacer: { width: 36 },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroLeft: { flex: 1, gap: 10 },
  heroOverline: { textTransform: 'uppercase', fontSize: 11, color: theme.sub, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
  heroSubtitle: { fontSize: 13, color: theme.sub },
  heroImage: { width: 82, height: 82, borderRadius: 20, backgroundColor: '#F3F4F6' },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: { fontWeight: '700', fontSize: 12 },
  summaryStrip: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 11, color: theme.sub, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: theme.text },
  section: { marginTop: 28, marginHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLabel: { color: theme.sub, fontSize: 13, fontWeight: '600' },
  infoValue: { color: theme.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  rewardCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rewardCardText: { flex: 1, color: theme.text, fontSize: 14, lineHeight: 20 },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorBoxText: { color: theme.danger, fontWeight: '600', textAlign: 'center' },
});

export default RedeemHistoryDetailScreen;
