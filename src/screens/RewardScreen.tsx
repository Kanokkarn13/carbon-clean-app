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
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import theme from '../utils/theme';
import { sumActivityPoints, ActivityPointSource } from '../utils/points';
import { fetchRewards, Reward } from '../services/rewardService';

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
};

export default function RewardScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const params = (route?.params ?? {}) as {
    totalPoints?: number;
    activities?: ActivityPointSource[];
  };
  const activities = Array.isArray(params.activities) ? params.activities : undefined;
  const totalPointsParam =
    typeof params.totalPoints === 'number' ? params.totalPoints : undefined;

  const totalPoints = useMemo(() => {
    if (activities?.length) return sumActivityPoints(activities);
    return totalPointsParam != null ? Math.max(0, Math.round(totalPointsParam)) : 0;
  }, [activities, totalPointsParam]);

  const pointsLabel = `${totalPoints.toLocaleString()} P`;
  const [query, setQuery] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const featuredReward = decoratedRewards[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Point Redemption</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={require('../../assets/trees.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Anita Wongchawalit</Text>
            <Text style={styles.profileSubtitle}>Eco Member</Text>
          </View>
          <View style={styles.pointChip}>
            <Text style={styles.pointChipValue}>{pointsLabel}</Text>
          </View>
        </View>

        <ImageBackground
          source={require('../../assets/reduce-bg.png')}
          style={styles.recommendCard}
          imageStyle={styles.recommendImage}
        >
          <LinearGradient
            colors={['rgba(11, 23, 33, 0.75)', 'rgba(11, 23, 33, 0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.recommendLabel}>Recommend</Text>
          <Text style={styles.recommendTitle} numberOfLines={2}>
            {featuredReward ? featuredReward.title : 'for you'}
          </Text>
          {featuredReward ? (
            <View style={styles.featuredChip}>
              <Ionicons name="gift-outline" size={14} color="#fff" />
              <Text style={styles.featuredChipText}>
                {featuredReward.cost_points.toLocaleString()} P
              </Text>
            </View>
          ) : null}
        </ImageBackground>

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
            <Text style={styles.stateText}>Loading rewards…</Text>
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
            <View key={item.id} style={styles.ticket}>
              <View style={styles.ticketNotchLeft} />
              <View style={styles.ticketNotchRight} />
              <View style={styles.ticketInner}>
                <View style={styles.ticketLeft}>
                  <View style={[styles.logoBubble, { backgroundColor: item.highlightColor }]}>
                    <Text style={[styles.logoLetter, { color: item.logoColor }]}>{item.logoLetter}</Text>
                  </View>
                  <Text style={styles.ticketBrand} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.ticketDivider}>
                  <View style={styles.ticketDividerLine} />
                </View>
                <View style={styles.ticketRight}>
                  <Text style={styles.ticketVendor} numberOfLines={2}>
                    {item.description || 'Redeem this reward'}
                  </Text>
                  <Text style={styles.ticketPoints}>
                    {item.cost_points.toLocaleString()}
                    <Text style={styles.ticketPointsSuffix}> Points</Text>
                  </Text>
                  {item.stock === 0 && <Text style={styles.ticketStock}>Out of stock</Text>}
                </View>
              </View>
            </View>
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
  headerPlaceholder: {
    width: 36,
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
  recommendCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    justifyContent: 'flex-end',
    padding: 20,
  },
  recommendImage: {
    borderRadius: 20,
  },
  recommendLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  recommendTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  featuredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 118, 110, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    marginTop: 12,
  },
  featuredChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  ticket: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  ticketNotchLeft: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.bg,
    left: -11,
    top: '50%',
    marginTop: -11,
  },
  ticketNotchRight: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.bg,
    right: -11,
    top: '50%',
    marginTop: -11,
  },
  ticketInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  ticketBrand: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  ticketDivider: {
    width: 50,
    alignItems: 'center',
  },
  ticketDividerLine: {
    width: 1,
    height: 48,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  ticketRight: {
    flex: 1,
  },
  ticketVendor: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  ticketPoints: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.primaryDark,
    marginTop: 4,
  },
  ticketPointsSuffix: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.sub,
  },
  ticketStock: {
    marginTop: 6,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
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


