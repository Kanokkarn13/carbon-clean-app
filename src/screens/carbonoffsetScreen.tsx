import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { calculateEmission } from "../hooks/calculateEmission";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(width * 0.9, 440);

type Navigation = NativeStackNavigationProp<any>;

export default function CarbonOffsetScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const params = route.params as { user?: any; distance?: number; duration?: number };

  const user = params?.user;
  const distance = params?.distance ?? 0;
  const duration = params?.duration ?? 0; // new param

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.missingText}>⚠ Missing user data</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  let emissionResult: number | string = 0;
  try {
    const [category, fuel, size] = (user.vehicle || "").split(",");
    const vehicleClass = category?.trim() === "Cars" ? `${size?.trim()} car` : size?.trim();
    emissionResult = calculateEmission(fuel?.trim(), vehicleClass, distance) || 0;
  } catch {}

  const value = typeof emissionResult === "number" ? emissionResult : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBox}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#064e3b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reduce Carbon</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.heroTitle}>Your Carbon Offset</Text>
        <Text style={styles.heroSubtitle}>Every step counts 🌱</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}>
        {/* Card */}
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name="leaf" size={14} color="#065F46" />
            <Text style={styles.badgeText}>Saving Our Planet</Text>
          </View>

          <View style={styles.valueBlock}>
            <Text style={styles.value}>{value.toFixed(2)}</Text>
            <Text style={styles.unit}>kgCO₂e</Text>
            <Text style={styles.caption}>Offset So Far</Text>
          </View>

          <View style={styles.statsRow}>
            <StatPill icon="walk" label="Distance" value={`${(distance ?? 0).toFixed(2)} km`} />
            <StatPill
              icon="time"
              label="Duration"
              value={`${Math.round(duration)} min`}
            />
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb" size={18} color="#059669" />
            <Text style={styles.tipText}>
              Consistent walking every day not only offsets carbon — it boosts your health too!
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- Reusable Stat Pill --- */
function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={pillStyles.pill}>
      <View style={pillStyles.iconWrap}>
        <Ionicons name={icon} size={14} color="#047857" />
      </View>
      <View>
        <Text style={pillStyles.label}>{label}</Text>
        <Text style={pillStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  headerBox: {
    backgroundColor: "#dcfce7",
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#064e3b",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#064e3b",
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    color: "#166534",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 14,
  },

  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 24,
    marginTop: -15,
    paddingVertical: 28,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dcfce7",
    borderColor: "#a7f3d0",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 18,
  },
  badgeText: {
    color: "#065f46",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  valueBlock: {
    alignItems: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 64,
    fontWeight: "900",
    color: "#0B1721",
    lineHeight: 70,
  },
  unit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#064e3b",
  },
  caption: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  tipBox: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    borderColor: "#bbf7d0",
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  tipText: {
    color: "#065f46",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 26,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  missingText: {
    textAlign: "center",
    color: "#b91c1c",
    fontSize: 16,
    marginBottom: 10,
  },
});

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: CARD_W / 2 - 18,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
  },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065f46",
  },
});
