import React, { useEffect, useRef, useState } from "react";
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
import { patchCarbonReduce } from "../utils/trackingHelpers";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(width * 0.9, 440);

type Navigation = NativeStackNavigationProp<any>;
type RouteParams = {
  user?: any;
  distance?: number;
  duration?: number;
  activityId?: number;
  goalType?: "walking" | "cycling";
  carbonReduce?: number;
};

export default function CarbonOffsetScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;

  const user = params?.user;
  const distance = params?.distance ?? 0;
  const duration = params?.duration ?? 0;
  const activityId = params?.activityId ?? null;
  const goalType = params?.goalType ?? "walking";
  const carbonReduce = params?.carbonReduce ?? 0;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const didAutoPatch = useRef(false);
  useEffect(() => {
    if (didAutoPatch.current) return;
    if (!activityId || !Number.isFinite(carbonReduce)) return;
    didAutoPatch.current = true;
    (async () => {
      setSaving(true);
      try {
        const res = await patchCarbonReduce(goalType, activityId, carbonReduce);
        if (res.ok) setSaved(true);
      } finally {
        setSaving(false);
      }
    })();
  }, [activityId, goalType, carbonReduce]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== SOLID GREEN HEADER (no shading) ===== */}
      <View style={styles.headerBox}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Reduce Carbon</Text>
        </View>
        <Text style={styles.heroTitle}>Your Carbon Offset</Text>
        <Text style={styles.heroSubtitle}>Every step counts 🌱</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingTop: 40, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name="leaf" size={14} color="#065F46" />
            <Text style={styles.badgeText}>Saving Our Planet</Text>
          </View>

          <View style={styles.valueBlock}>
            <Text style={styles.value}>{carbonReduce.toFixed(2)}</Text>
            <Text style={styles.unit}>kgCO₂e</Text>
            <Text style={styles.caption}>Offset So Far</Text>
            {saving && <Text style={styles.syncText}>Syncing…</Text>}
            {saved && <Text style={[styles.syncText, { color: "#16a34a" }]}>✓ Synced</Text>}
          </View>

          <View style={styles.statsRow}>
            <StatPill icon="walk" label="Distance" value={`${distance.toFixed(2)} km`} />
            <StatPill icon="time" label="Duration" value={`${Math.round(duration)} min`} />
          </View>

          {/* ✅ your Back button unchanged */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 16 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={18} color="#065f46" />
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- Stat Pill --- */
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
  container: { flex: 1, backgroundColor: "#fff" },
  headerBox: {
    backgroundColor: "#bbf7d0", // ✅ solid green (no shading)
    height: 230, // bigger
    justifyContent: "center",
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: { alignItems: "center", marginBottom: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#064e3b",
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#064e3b",
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    color: "#065f46",
    fontWeight: "600",
    fontSize: 15,
    marginTop: 4,
  },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 24,
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
  valueBlock: { alignItems: "center", marginBottom: 12 },
  value: { fontSize: 68, fontWeight: "900", color: "#0B1721", lineHeight: 72 },
  unit: { fontSize: 18, fontWeight: "700", color: "#064e3b" },
  caption: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  syncText: { marginTop: 6, color: "#065f46", fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  secondaryBtn: {
    backgroundColor: "#dcfce7",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  secondaryBtnText: { color: "#065f46", fontSize: 15, fontWeight: "800" },
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
  value: { fontSize: 15, fontWeight: "800", color: "#065f46" },
});
