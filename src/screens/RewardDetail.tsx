import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '../utils/theme';
import type { RootStackParamList, User } from './HomeStack';
import type { Reward } from '../services/rewardService';

type RewardDetailRouteParams = {
  reward: Reward & {
    highlightColor?: string;
    logoColor?: string;
    logoLetter?: string;
  };
  totalPoints?: number;
  user?: User;
};

type RewardDetailNav = NativeStackNavigationProp<RootStackParamList, 'RewardDetail'>;

export default function RewardDetail() {
  const navigation = useNavigation<RewardDetailNav>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RewardDetailRouteParams;
  const { reward } = params;

  const pointsLabel = `${(reward?.cost_points ?? 0).toLocaleString()} P`;
  const highlight = reward?.highlightColor ?? 'rgba(16, 185, 129, 0.12)';
  const logoColor = reward?.logoColor ?? theme.primaryDark;
  const logoLetter = reward?.logoLetter ?? reward?.title?.charAt(0)?.toUpperCase() ?? 'R';

  const expiresText = reward?.expires_at
    ? new Date(reward.expires_at).toLocaleDateString()
    : 'No expiry';
  const stockText =
    reward?.stock === null || reward?.stock === undefined ? 'Unlimited' : String(reward.stock);
  const description = reward?.description || 'No description provided.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reward Detail</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={[styles.hero, { backgroundColor: highlight }]}>
          {reward?.image_url ? (
            <Image source={{ uri: reward.image_url }} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <View style={[styles.logoBubble, { backgroundColor: '#fff' }]}>
              <Text style={[styles.logoLetter, { color: logoColor }]}>{logoLetter}</Text>
            </View>
          )}
          <Text style={styles.rewardTitle}>{reward?.title ?? 'Reward'}</Text>
          <Text style={styles.pointsValue}>{pointsLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.sectionText}>{description}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Expires</Text>
            <Text style={styles.infoValue}>{expiresText}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Stock</Text>
            <Text style={styles.infoValue}>{stockText}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How to redeem</Text>
          <Text style={styles.sectionText}>
            Contact your program administrator to use this reward. Make sure you have enough points
            before redeeming.
          </Text>
        </View>

        <TouchableOpacity style={styles.redeemButton} activeOpacity={0.85} disabled>
          <Ionicons name="lock-closed-outline" size={18} color="#fff" />
          <Text style={styles.redeemButtonText}>Redeem coming soon</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  hero: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  heroImage: {
    width: 140,
    height: 100,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  logoBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: '800',
  },
  rewardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
  },
  pointsValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: theme.primaryDark,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.sub,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.text,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.sub,
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  redeemButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.primaryDark,
    opacity: 0.7,
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
