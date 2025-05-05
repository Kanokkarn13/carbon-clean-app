import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const HomeScreen = ({ user, navigation }) => {
  const [activities, setActivities] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (user?.user_id && isFocused) {
      const url = `http://192.168.0.102:3000/api/recent-activity/${user.user_id}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.activities)) {
            setActivities(data.activities.slice(0, 10));
          } else {
            setActivities([]);
          }
        })
        .catch(() => setActivities([]));
    }
  }, [user, isFocused]);

  const handleActivityPress = () => {
    navigation.navigate('Calculation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user ? `${user.fname} ${user.lname}` : 'Guest'}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>0 P</Text>
          </View>
        </View>

        <View style={styles.taskCardWrapper}>
          <ImageBackground
            source={require('../../assets/trees.png')}
            style={styles.taskCard}
            imageStyle={{ borderRadius: 16 }}
          >
            <Text style={styles.taskText}>complete your tasks</Text>
            <Text style={styles.progressText}>0%</Text>
            <TouchableOpacity
              style={styles.addGoalBtn}
              onPress={() => navigation.navigate('SetGoal', { user })}
            >
              <Text style={styles.addGoalText}>Set Your Goal</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>

        {/* ✅ This is the corrected Dashboard button */}
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate('Dashboard', { user })}
        >
          <Text style={styles.dashboardText}>Go To Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Activity</Text>
        <TouchableOpacity style={styles.activityBox} onPress={handleActivityPress}>
          <View style={styles.co2Circle}>
            <Text style={styles.co2XX}>Go to calculate</Text>
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>Emission</Text>
            <Text style={styles.emission}>0.00 kgCO₂e</Text>
            <Text style={[styles.activityText, { marginTop: 10 }]}>Last month</Text>
            <Text style={styles.lastMonth}>0.00 kgCO₂e</Text>
            <Text style={[styles.activityText, { marginTop: 10 }]}>total</Text>
            <Text style={styles.total}>0.00 kgCO₂e</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activities.map((activity, index) => (
          <View key={index} style={styles.recentBox}>
            <Ionicons name={activity.type === 'Cycling' ? 'bicycle' : 'walk'} size={24} color="#000" />
            <Text style={styles.recentText}>{activity.type}: {activity.distance_km} km</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  greeting: { fontSize: 14, color: '#555' },
  name: { fontSize: 18, fontWeight: 'bold' },
  pointsBadge: {
    backgroundColor: '#00AA55',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 'auto',
  },
  pointsText: { color: '#fff', fontWeight: 'bold' },
  taskCardWrapper: {
    backgroundColor: '#d2f4d2',
    borderRadius: 20,
    marginTop: 20,
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  taskText: { color: '#444', fontSize: 14, marginBottom: 8 },
  progressText: { fontSize: 36, fontWeight: 'bold', color: '#000' },
  addGoalBtn: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  addGoalText: { color: '#00AA55', fontWeight: 'bold' },
  dashboardBtn: {
    backgroundColor: '#00AA55',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  dashboardText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 6 },
  activityBox: {
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 16,
  },
  co2Circle: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  co2XX: { fontSize: 28, fontWeight: 'bold', color: '#00AA55' },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 12, color: '#888' },
  emission: { fontSize: 16, fontWeight: 'bold' },
  lastMonth: { fontSize: 14, color: '#aaa' },
  total: { fontSize: 14, color: '#00AA55' },
  recentBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  recentText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
});

export default HomeScreen;
