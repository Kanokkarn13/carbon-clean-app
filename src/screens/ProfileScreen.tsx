// src/screens/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getUser, logout } from "../services/authService";
import { CommonActions } from "@react-navigation/native";

// ---------- Types ----------
type Navigation = NativeStackNavigationProp<any>;
type ProfileStackParamList = {
  ProfileMain: { user: any; onLogout?: () => void } | undefined;
  ProfileEdit: { user: any } | undefined;
};

// ---------- Theme ----------
const theme = {
  green: "#22C55E",
  greenDark: "#16A34A",
  yellow: "#FACC15",
  yellowLight: "#FEF9C3",
  orange: "#FB923C",
  orangeLight: "#FFF7ED",
  blue: "#3B82F6",
  bg: "#F6FAF8",
  text: "#0B1721",
  sub: "#6B7280",
  border: "#E5E7EB",
};

// ---------- API BASE ----------
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.102:3000";
const API_BASE = RAW_BASE.replace(/\/+$/, ""); // ตัด '/' ท้าย
const api = (path: string) => `${API_BASE}/api${path}`;

type ActivityRow = {
  type?: "Walking" | "Cycling" | string;
  distance_km?: number | string;
  duration_sec?: number | string;
  step_total?: number | string;
  title?: string;
  description?: string;
  record_date?: string;
  id?: number | string;
  carbonReduce?: number | string;
  carbon_reduce_kg?: number | string;
  carbon_reduce_g?: number | string;
};

// ---------- Utils ----------
function toNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function carbonKgFromRow(r: ActivityRow): number {
  const kg =
    toNumber(r.carbonReduce) ??
    toNumber(r.carbon_reduce_kg) ??
    (toNumber(r.carbon_reduce_g) != null
      ? toNumber(r.carbon_reduce_g)! / 1000
      : undefined);
  return kg ?? 0;
}

// ---------- Main Component ----------
export default function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<ProfileStackParamList, "ProfileMain">>();
  const routeUser = route.params?.user ?? null;
  const logoutCb = route.params?.onLogout;

  const [user, setUser] = useState<any | null>(routeUser);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [mode, setMode] = useState<"sum" | "walk" | "cycle">("sum");

  const loadAll = async () => {
    setLoading(true);
    try {
      const u = routeUser ?? (await getUser());
      setUser(u || null);

      if (u?.user_id) {
        const res = await fetch(api(`/recent-activity/${u.user_id}`));
        const json = await res.json();
        const arr: ActivityRow[] = Array.isArray(json.activities)
          ? json.activities
          : [];
        const norm = arr.map((a) => ({
          ...a,
          distance_km: Number(a.distance_km) || 0,
          type: (a.type as any) || "Activity",
        }));
        setActivities(norm);
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error("❌ Failed to load profile data:", e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [routeUser]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            console.error("Logout failed:", err);
          }
          logoutCb?.();
          const parent = navigation.getParent();
          const root = parent?.getParent();
          const action = CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          if (root) root.dispatch(action);
          else if (parent) parent.dispatch(action);
          else navigation.dispatch(action);
        },
      },
    ]);
  }, [navigation, logoutCb]);

  const {
    totalWalkKm,
    totalCycleKm,
    walkingPct,
    cyclingPct,
    carbonWalkKg,
    carbonCycleKg,
    carbonSumKg,
  } = useMemo(() => {
    const walkRows = activities.filter((a) => a.type === "Walking");
    const cycleRows = activities.filter((a) => a.type === "Cycling");

    const totalWalkKm = walkRows.reduce(
      (s, a) => s + (Number(a.distance_km) || 0),
      0
    );
    const totalCycleKm = cycleRows.reduce(
      (s, a) => s + (Number(a.distance_km) || 0),
      0
    );
    const carbonWalkKg = walkRows.reduce((s, a) => s + carbonKgFromRow(a), 0);
    const carbonCycleKg = cycleRows.reduce((s, a) => s + carbonKgFromRow(a), 0);
    const carbonSumKg = carbonWalkKg + carbonCycleKg;

    const walkGoal = Math.max(1, Number(user?.walk_goal) || 100);
    const cycleGoal = Math.max(1, Number(user?.bic_goal) || 100);

    return {
      totalWalkKm,
      totalCycleKm,
      walkingPct: Math.min((totalWalkKm / walkGoal) * 100, 100),
      cyclingPct: Math.min((totalCycleKm / cycleGoal) * 100, 100),
      carbonWalkKg,
      carbonCycleKg,
      carbonSumKg,
    };
  }, [activities, user]);

  if (loading)
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.greenDark} />
      </SafeAreaView>
    );

  if (!user)
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.empty}>No user data available</Text>
        <TouchableOpacity onPress={loadAll} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>Reload</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  const carbonKg =
    mode === "sum"
      ? carbonSumKg
      : mode === "walk"
      ? carbonWalkKg
      : carbonCycleKg;
  const distanceKm =
    mode === "sum"
      ? totalWalkKm + totalCycleKm
      : mode === "walk"
      ? totalWalkKm
      : totalCycleKm;
  const trees = Math.floor(carbonKg / 50);
  const stadiumRounds = Math.round(distanceKm / 0.4);
  const showWalkRow = mode === "sum" || mode === "walk";
  const showCycleRow = mode === "sum" || mode === "cycle";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Profile</Text>

        {/* === Profile Card === */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                user?.profile_picture ||
                "https://preview.redd.it/help-me-find-instagram-account-of-this-cat-he-she-looks-so-v0-twu4der3mpud1.jpg?width=640&crop=smart&auto=webp&s=e50ba618c5b563dc1dc37dc98e6fb8c29276dafd",
            }}
            style={styles.profileImage}
          />
          <Text style={styles.userName}>
            {user?.fname ?? ""} {user?.lname ?? ""}
          </Text>

        <View style={styles.profileButtonRow}>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("ProfileEdit", { user })}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.9}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        </View>

        {/* === Progress Section === */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressHeader}>Your Progress</Text>
            <View style={styles.toggleContainer}>
              {(["sum", "walk", "cycle"] as const).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setMode(key)}
                  style={[
                    styles.toggleBtn,
                    mode === key && { backgroundColor: theme.green },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: mode === key ? "#fff" : theme.text },
                    ]}
                  >
                    {key === "sum"
                      ? "Sum"
                      : key === "walk"
                      ? "Walking"
                      : "Cycling"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Carbon */}
          <View style={styles.progressRow}>
            <View style={[styles.iconWrap, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="leaf-outline" size={20} color={theme.greenDark} />
            </View>
            <View style={styles.progressTextWrap}>
              <Text style={[styles.progressNumber, { color: theme.greenDark }]}>
                {formatNum(carbonKg)} kg
              </Text>
              <Text style={styles.progressDesc}>
                You have saved {formatNum(carbonKg)} kg of carbon! That’s
                equivalent to {trees} trees planted.
              </Text>
            </View>
          </View>

          {/* Walking */}
          {showWalkRow && (
            <View style={styles.progressRow}>
              <View
                style={[styles.iconWrap, { backgroundColor: theme.yellowLight }]}
              >
                <Ionicons
                  name="walk-outline"
                  size={20}
                  color={theme.yellow}
                />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={[styles.progressNumber, { color: theme.yellow }]}>
                  {walkingPct.toFixed(1)}%
                </Text>
                <Text style={styles.progressDesc}>
                  You’re at {walkingPct.toFixed(1)}% of your walking goal.
                </Text>
              </View>
            </View>
          )}

          {/* Cycling */}
          {showCycleRow && (
            <View style={styles.progressRow}>
              <View
                style={[styles.iconWrap, { backgroundColor: theme.orangeLight }]}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={20}
                  color={theme.orange}
                />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={[styles.progressNumber, { color: theme.orange }]}>
                  {cyclingPct.toFixed(1)}%
                </Text>
                <Text style={styles.progressDesc}>
                  You’re at {cyclingPct.toFixed(1)}% of your cycling goal.
                </Text>
              </View>
            </View>
          )}

          {/* Distance */}
          <View style={styles.progressRow}>
            <View style={[styles.iconWrap, { backgroundColor: "#EAF2FE" }]}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.blue}
              />
            </View>
            <View style={styles.progressTextWrap}>
              <Text style={[styles.progressNumber, { color: theme.blue }]}>
                {formatNum(distanceKm)} km
              </Text>
              <Text style={styles.progressDesc}>
                You have travelled {formatNum(distanceKm)} km — around{" "}
                {stadiumRounds} stadium rounds!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatNum(n?: number) {
  const num = Number(n ?? 0);
  return num < 10 ? num.toFixed(2) : num.toFixed(1);
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: theme.sub },
  reloadBtn: {
    marginTop: 12,
    backgroundColor: theme.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reloadText: { color: "#fff" },

  container: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 48 },
  header: { fontSize: 20, color: theme.text, marginTop: 10, marginBottom: 18 },

  profileCard: { alignItems: "center", marginBottom: 24 },
  profileImage: {
    width: 270,
    height: 270,
    borderRadius: 32,
    resizeMode: "cover",
    marginBottom: 20,
  },
  userName: { fontSize: 18, color: theme.text, marginBottom: 8 },
  pointChip: {
    backgroundColor: "#dadbddff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  pointText: { color: theme.text },
  profileButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editBtn: {
    backgroundColor: theme.green,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  editBtnText: { color: "#FFF", fontSize: 16 },
  logoutBtn: {
    backgroundColor: theme.orange,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoutText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

  progressSection: { width: "100%", marginTop: 10 },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressHeader: { fontSize: 18, color: theme.text },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 2,
  },
  toggleText: { fontSize: 12 },

  progressRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTextWrap: { marginLeft: 10, flex: 1 },
  progressNumber: { fontSize: 16, marginBottom: 2 },
  progressDesc: { fontSize: 13, color: theme.sub },
});
