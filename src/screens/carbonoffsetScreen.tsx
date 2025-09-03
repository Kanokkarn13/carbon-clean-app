import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { calculateEmission } from "../hooks/calculateEmission";

const { width } = Dimensions.get("window");
const cardWidth = width * 0.9;

type Navigation = NativeStackNavigationProp<any>;

export default function CarbonOffsetScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const params = route.params as { user?: any; distance?: number };

  console.log("🐛 route.params:", params);

  const user = params?.user;
  const distance = params?.distance ?? 0;

  if (!user) {
    console.log("❌ user is undefined in route.params");
    return (
      <View style={styles.container}>
        <Text style={{ color: "red", fontSize: 16 }}>
          ❌ Missing user data. Please navigate properly.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log("✅ user object:", user);
  console.log("📏 distance:", distance);
  console.log("🚗 vehicle string:", user.vehicle);

  let vehicleClass = '';
  let emissionResult: number | string = 'Invalid input';

  try {
    const [category, fuel, size] = user.vehicle.split(",");
    vehicleClass = category.trim() === "Cars" ? `${size.trim()} car` : size.trim();
    console.log("🚙 Parsed:", { fuel, vehicleClass });

    emissionResult = calculateEmission(fuel.trim(), vehicleClass, distance);
    console.log("📉 Emission result:", emissionResult);
  } catch (error) {
    console.error("❌ Error parsing vehicle or calculating emission:", error);
  }

  const displayEmission =
    typeof emissionResult === "number" ? emissionResult.toFixed(2) : "0.00";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reduce Carbon</Text>

      <ImageBackground
        source={require("../../assets/reduce-bg.png")}
        style={styles.card}
        imageStyle={styles.cardImage}
      >
        <Text style={styles.green}>THANKS FOR</Text>
        <Text style={styles.green}>SAVING OUR PLANET</Text>

        <Text style={styles.gray}>You have already reduced</Text>
        <Text style={styles.gray}>your carbon footprint for</Text>

        <Text style={styles.co2}>{displayEmission}</Text>
        <Text style={styles.unit}>kgCO2e</Text>
        <Text style={styles.offset}>off set</Text>
      </ImageBackground>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 20,
  },
  card: {
    width: cardWidth,
    height: cardWidth * 1.2,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  cardImage: {
    resizeMode: "cover",
    borderRadius: 28,
  },
  green: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: 4,
  },
  gray: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 2,
  },
  co2: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#000",
    marginTop: 12,
  },
  unit: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  offset: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginTop: 4,
  },
  button: {
    marginTop: 30,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
