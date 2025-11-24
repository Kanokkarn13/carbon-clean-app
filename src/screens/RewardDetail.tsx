import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '../utils/theme';
import type { RootStackParamList, User } from './HomeStack';
import type { RedeemResponse, Reward } from '../services/rewardService';
import { redeemReward, fetchPointsBalance } from '../services/rewardService';

type RewardDetailRouteParams = {
  reward: Reward & {
    highlightColor?: string;
    logoColor?: string;
    logoLetter?: string;
    logoUrl?: string | null;
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
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<RedeemResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const userId = useMemo(() => {
    const raw = (params.user as any)?.user_id ?? (params.user as any)?.id;
    const n = raw != null ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params.user]);

  const availablePoints = useMemo(() => {
    if (typeof balance === 'number') return Math.max(0, Math.round(balance));
    return Math.max(0, Math.round(params?.totalPoints ?? 0));
  }, [balance, params?.totalPoints]);

  React.useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const load = async () => {
      setBalanceLoading(true);
      try {
        const resp = await fetchPointsBalance(userId);
        if (mounted) setBalance(resp.available);
      } catch (err) {
        console.warn('⚠️ Failed to fetch balance', err);
      } finally {
        if (mounted) setBalanceLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const pointsLabel = `${(reward?.cost_points ?? 0).toLocaleString()} P`;
  const highlight = reward?.highlightColor ?? 'rgba(16, 185, 129, 0.12)';
  const logoColor = reward?.logoColor ?? theme.primaryDark;
  const logoLetter = reward?.logoLetter ?? reward?.title?.charAt(0)?.toUpperCase() ?? 'R';
  const logoUrl = reward?.logoUrl ?? reward?.image_url ?? null;

  const expiresText = reward?.expires_at
    ? new Date(reward.expires_at).toLocaleDateString()
    : 'No expiry';
  const stockText =
    reward?.stock === null || reward?.stock === undefined ? 'Unlimited' : String(reward.stock);
  const description = reward?.description || 'No description provided.';

  const canRedeem = useMemo(() => {
    if (!userId || !reward?.id) return false;
    return availablePoints >= (reward?.cost_points ?? 0);
  }, [availablePoints, reward?.cost_points, reward?.id, userId]);

  const onRedeem = useCallback(async () => {
    if (!reward?.id) return;
    if (!userId) {
      setRedeemError('Please sign in again to redeem this reward.');
      return;
    }
    setRedeeming(true);
    setRedeemError(null);
    try {
      const result = await redeemReward({
        user_id: userId,
        reward_id: reward.id,
        cost_points: reward.cost_points,
      });
      setVoucher(result);
    } catch (err: any) {
      setRedeemError(err?.message || 'Failed to redeem this reward.');
    } finally {
      setRedeeming(false);
    }
  }, [reward?.cost_points, reward?.id, userId]);

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
          <View style={styles.heroLogo}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.heroLogoImage} resizeMode="contain" />
            ) : (
              <View style={[styles.logoBubble, { backgroundColor: '#fff' }]}>
                <Text style={[styles.logoLetter, { color: logoColor }]}>{logoLetter}</Text>
              </View>
            )}
          </View>
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
            Redeem to generate a QR voucher instantly. Show the QR or voucher code to the cashier
            before it expires (7 days).
          </Text>
        </View>

        {redeemError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
            <Text style={styles.errorText}>{redeemError}</Text>
          </View>
        )}

        {voucher ? (
          <View style={styles.voucherCard}>
            <Text style={styles.voucherTitle}>Voucher ready</Text>
            <Text style={styles.voucherCode}>{voucher.voucher_code}</Text>
            <Text style={styles.voucherHint}>Show this QR to redeem</Text>
            {voucher.qr_image_url ? (
              <Image source={{ uri: voucher.qr_image_url }} style={styles.voucherQr} />
            ) : (
              <View style={[styles.voucherQr, styles.voucherQrFallback]}>
                <Ionicons name="qr-code-outline" size={32} color={theme.primaryDark} />
              </View>
            )}
            <Text style={styles.voucherExpiry}>
              Expires {new Date(voucher.expires_at).toLocaleString()}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.redeemButton,
              (!canRedeem || redeeming) && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            disabled={!canRedeem || redeeming}
            onPress={onRedeem}
          >
            {redeeming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
            <Text style={styles.redeemButtonText}>
              {canRedeem ? 'Redeem reward' : 'Not enough points'}
            </Text>
          </TouchableOpacity>
        )}

        {!voucher && (
          <Text style={styles.helperText}>
            {userId
              ? 'You need enough available points for this reward.'
              : 'Sign in to redeem and view vouchers.'}
          </Text>
        )}
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
  heroLogo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  heroLogoImage: {
    width: '70%',
    height: '70%',
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
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  helperText: {
    marginTop: 10,
    color: theme.sub,
    textAlign: 'center',
  },
  errorBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: theme.danger, flex: 1 },
  voucherCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    gap: 8,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  voucherCode: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.primaryDark,
    letterSpacing: 2,
  },
  voucherHint: { color: theme.sub, fontSize: 14 },
  voucherQr: { width: 200, height: 200, borderRadius: 12, marginTop: 8, backgroundColor: '#F8FAFC' },
  voucherQrFallback: {
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherExpiry: { color: theme.sub, fontSize: 13 },
});
