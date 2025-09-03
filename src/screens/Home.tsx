import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  chip: '#ECFDF5',
};

const HomeScreen = ({ user, navigation }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.user_id || !isFocused) return;
      setLoading(true);
      try {
        const url = `http://192.168.0.102:3000/api/recent-activity/${user.user_id}`;
        const res = await fetch(url);
        const data = await res.json();
        setActivities(Array.isArray(data.activities) ? data.activities.slice(0, 10) : []);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [user, isFocused]);

  const handleActivityPress = () => navigation.navigate('Calculation');

  const fullName = user ? `${user.fname} ${user.lname}` : 'Guest';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: user?.profile_picture || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.name}>{fullName}</Text>
            </View>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="sparkles-outline" size={14} color={theme.primaryDark} />
            <Text style={styles.pointsText}>0 P</Text>
          </View>
        </View>

        {/* Task / Goal card */}
        <View style={styles.card}>
          <ImageBackground
            source={require('../../assets/trees.png')}
            style={styles.taskBg}
            imageStyle={{ borderRadius: 16, opacity: 0.12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.cardTitle}>Complete your tasks</Text>
                <Text style={styles.progressBig}>0%</Text>
                <View style={styles.progressBarWrap}>
                  <View style={[styles.progressBarFill, { width: '0%' }]} />
                </View>
              </View>
              <TouchableOpacity
                style={styles.pillBtn}
                onPress={() => navigation.navigate('SetGoal', { user })}
                activeOpacity={0.9}
              >
                <Ionicons name="flag-outline" size={16} color={theme.primaryDark} />
                <Text style={styles.pillBtnText}>Set your goal</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Dashboard', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="speedometer-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Calculation')}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="calculator-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Calculate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('SetGoal', { user })}
            activeOpacity={0.9}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="leaf-outline" size={20} color={theme.primaryDark} />
            </View>
            <Text style={styles.quickLabel}>Goals</Text>
          </TouchableOpacity>
        </View>

        {/* Activity summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <TouchableOpacity style={styles.activityBox} onPress={handleActivityPress} activeOpacity={0.9}>
            <View style={styles.co2Circle}>
              <Ionicons name="trending-down-outline" size={18} color={theme.primary} />
              <Text style={styles.co2XX}>Calculate</Text>
            </View>
            <View style={styles.activityInfo}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Emission</Text>
                <Text style={styles.statValue}>0.00 kgCO₂e</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last month</Text>
                <Text style={styles.statMuted}>0.00 kgCO₂e</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statPositive}>0.00 kgCO₂e</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={18} color={theme.sub} />
              <Text style={styles.emptyText}>No recent activity yet</Text>
            </View>
          ) : (
            activities.map((activity, idx) => {
              const icon =
                activity.type === 'Cycling'
                  ? 'bicycle-outline'
                  : activity.type === 'Running'
                  ? 'run-outline'
                  : 'walk-outline';
              return (
                <View key={`${activity.type}-${idx}`} style={styles.recentItem}>
                  <View style={styles.recentIcon}>
                    <Ionicons name={icon as any} size={18} color={theme.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle}>{activity.type}</Text>
                    <Text style={styles.recentSub}>{Number(activity.distance_km || 0)} km</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.border} />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 44 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff' },
  greeting: { fontSize: 12, color: theme.sub },
  name: { fontSize: 18, fontWeight: '700', color: theme.text },
  pointsBadge: {
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsText: { color: theme.primaryDark, fontWeight: '700' },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { color: theme.text, fontWeight: '700', fontSize: 16 },
  taskBg: { borderRadius: 16 },
  progressBig: { fontSize: 32, fontWeight: '800', color: theme.text, marginTop: 2 },
  progressBarWrap: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: theme.primary,
    borderRadius: 999,
  },
  pillBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillBtnText: { color: theme.primaryDark, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontWeight: '700', color: theme.text },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
  activityBox: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 14,
    gap: 14,
    alignItems: 'center',
  },
  co2Circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  co2XX: { fontSize: 14, fontWeight: '800', color: theme.primaryDark },
  activityInfo: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: theme.sub, fontSize: 12 },
  statValue: { color: theme.text, fontWeight: '700' },
  statMuted: { color: theme.sub, fontWeight: '600' },
  statPositive: { color: theme.primaryDark, fontWeight: '700' },

  emptyState: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { color: theme.sub },

  recentItem: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  recentTitle: { fontWeight: '700', color: theme.text },
  recentSub: { color: theme.sub, marginTop: 2 },
});

export default HomeScreen;
