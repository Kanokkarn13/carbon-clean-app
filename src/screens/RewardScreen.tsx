import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '../utils/theme';
import { sumActivityPoints, ActivityPointSource } from '../utils/points';
import { fetchRewards, Reward } from '../services/rewardService';
import type { RootStackParamList, User } from './HomeStack';

const COLOR_PALETTE = [
  { highlight: '#FEF3C7', logo: '#92400E' },
  { highlight: '#FEE2E2', logo: '#991B1B' },
  { highlight: '#DCFCE7', logo: '#047857' },
  { highlight: '#CCFBF1', logo: '#0F766E' },
  { highlight: '#E0F2FE', logo: '#0369A1' },
  { highlight: '#FCE7F3', logo: '#9D174D' },
];

type DecoratedReward = Reward & {
  highlightColor: string;
  logoColor: string;
  logoLetter: string;
  logoUrl: string | null;
};

const FALLBACK_LOGOS: { match: RegExp; url: string }[] = [
  { match: /starbucks/i, url: 'https://upload.wikimedia.org/wikipedia/sco/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/297px-Starbucks_Corporation_Logo_2011.svg.png?20170312192423' },
  { match: /grab/i, url: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Grab_%28application%29_logo.svg/960px-Grab_%28application%29_logo.svg.png?20220725160235' },
  { match: /shopee/i, url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/960px-Shopee.svg.png' },
  { match: /amazon/i, url: 'https://images.seeklogo.com/logo-png/37/1/cafe-amazon-logo-png_seeklogo-373926.png' },
];

const resolveLogoUrl = (title?: string, imageUrl?: string | null) => {
  const clean = imageUrl?.trim();
  if (clean) return clean;
  if (!title) return null;
  const match = FALLBACK_LOGOS.find((entry) => entry.match.test(title));
  return match ? match.url : null;
};

export default function RewardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Reward'>>();
  const route = useRoute<any>();
  const params = (route?.params ?? {}) as {
    totalPoints?: number;
    activities?: ActivityPointSource[];
    user?: User;
  };
  const rawActivities =
    params && Object.prototype.hasOwnProperty.call(params, 'activities')
      ? (params as { activities?: ActivityPointSource[] }).activities
      : undefined;
  const activities = Array.isArray(rawActivities) ? rawActivities : undefined;
  const totalPointsParam =
    typeof params.totalPoints === 'number' ? params.totalPoints : undefined;

  const totalPoints = useMemo(() => {
    if (Array.isArray(activities) && activities.length) {
      try {
        return Math.max(0, Math.round(sumActivityPoints(activities as any)));
      } catch {
        // fall back to provided total
      }
    }
    return totalPointsParam != null ? Math.max(0, Math.round(totalPointsParam)) : 0;
  }, [activities, totalPointsParam]);

  const pointsLabel = `${totalPoints.toLocaleString()} P`;
  const [query, setQuery] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = useMemo(() => {
    const fname = params.user?.fname ?? '';
    const lname = params.user?.lname ?? '';
    const full = `${fname} ${lname}`.trim();
    if (full) return full;
    return params.user?.email ?? 'Member';
  }, [params.user]);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchRewards();
      setRewards(items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rewards');
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const decoratedRewards: DecoratedReward[] = useMemo(() => {
    return rewards.map((reward, index) => {
      const palette = COLOR_PALETTE[index % COLOR_PALETTE.length];
      const letter = reward.title?.trim()?.charAt(0)?.toUpperCase() || 'R';
      return {
        ...reward,
        highlightColor: palette.highlight,
        logoColor: palette.logo,
        logoLetter: letter,
        logoUrl: resolveLogoUrl(reward.title, reward.image_url),
      };
    });
  }, [rewards]);

  const items = useMemo(() => {
    if (!query.trim()) return decoratedRewards;
    const q = query.toLowerCase();
    return decoratedRewards.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        `${item.cost_points}`.includes(q),
    );
  }, [decoratedRewards, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards</Text>
          <TouchableOpacity
            style={styles.headerHistoryButton}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('RedeemHistory', {
                user: params.user,
                totalPoints,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="View redeem history"
          >
            <Ionicons name="time-outline" size={20} color={theme.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.profileSubtitle}>Available points</Text>
          </View>
          <View style={styles.pointChip}>
            <Text style={styles.pointChipValue}>{pointsLabel}</Text>
          </View>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search rewards"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            selectionColor={theme.primary}
          />
        </View>

        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.stateText}>Loading rewards...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.stateBox}>
            <Ionicons name="warning-outline" size={18} color="#DC2626" />
            <Text style={[styles.stateText, { color: '#DC2626' }]}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadRewards}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.rewardsList}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.rewardRow}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('RewardDetail', {
                  reward: item,
                  totalPoints,
                  user: params.user,
                })
              }
            >
              <View style={styles.rewardLogo}>
                {item.logoUrl ? (
                  <Image
                    source={{ uri: item.logoUrl }}
                    style={styles.rewardLogoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.logoBubble, { backgroundColor: item.highlightColor }]}>
                    <Text style={[styles.logoLetter, { color: item.logoColor }]}>{item.logoLetter}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle} numberOfLines={3}>
                  {item.title}
                </Text>
                {item.stock === 0 && <Text style={styles.rewardSubtitle}>Out of stock</Text>}
              </View>
              <Text style={styles.rewardPoints}>{item.cost_points.toLocaleString()} P</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.sub} />
            </TouchableOpacity>
          ))}

          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={28} color={theme.primary} />
              <Text style={styles.emptyTitle}>No rewards match your search.</Text>
              <Text style={styles.emptyCopy}>Try a different name or points value.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
  },
  headerHistoryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  profileSubtitle: {
    fontSize: 13,
    marginTop: 2,
    color: theme.sub,
  },
  pointChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.primary,
  },
  pointChipValue: {
    color: '#fff',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF5F1',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: theme.text,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  stateText: {
    color: theme.sub,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  retryText: {
    color: theme.primary,
    fontWeight: '700',
  },
  rewardsList: {
    gap: 16,
  },
  logoBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 22,
    fontWeight: '800',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    minHeight: 96,
  },
  rewardLogo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F2F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rewardLogoImage: {
    width: '70%',
    height: '70%',
  },
  rewardInfo: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  rewardSubtitle: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.primaryDark,
    marginRight: 10,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 14,
    color: theme.sub,
    textAlign: 'center',
  },
});


