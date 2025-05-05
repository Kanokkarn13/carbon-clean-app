import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const Dashboard: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params as { user: any };
  const [walkingProgress, setWalkingProgress] = useState<number>(0);
  const [cyclingProgress, setCyclingProgress] = useState<number>(0);
  const [walkingData, setWalkingData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]); // Initialize with zeros
  const [cyclingData, setCyclingData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]); // Initialize with zeros
  const [labels, setLabels] = useState<string[]>(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
  const [emissionData, setEmissionData] = useState<number>(0.1); // Minimum value
  const [reductionData, setReductionData] = useState<number>(0.1); // Minimum value

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        const response = await fetch(`http://192.168.0.102:3000/api/recent-activity/${user.user_id}`);
        const result = await response.json();

        const weekData: { [day: string]: { walking: number; cycling: number } } = {
          Mo: { walking: 0, cycling: 0 },
          Tu: { walking: 0, cycling: 0 },
          We: { walking: 0, cycling: 0 },
          Th: { walking: 0, cycling: 0 },
          Fr: { walking: 0, cycling: 0 },
          Sa: { walking: 0, cycling: 0 },
          Su: { walking: 0, cycling: 0 },
        };

        result.activities.forEach((activity: any) => {
          const date = new Date(activity.created_at);
          const day = date.toLocaleDateString('en-US', { weekday: 'short' });
          const key = day.slice(0, 2);
          const raw = activity.distance_km;
          const distance = isFinite(raw) && !isNaN(raw) ? Math.max(0, raw) : 0; // Ensure positive finite numbers

          if (weekData[key]) {
            if (activity.type === 'Walking') {
              weekData[key].walking += distance;
            } else if (activity.type === 'Cycling') {
              weekData[key].cycling += distance;
            }
          }
        });

        const walkingData = Object.values(weekData).map((d) => (isFinite(d.walking) ? d.walking : 0));
        const cyclingData = Object.values(weekData).map((d) => (isFinite(d.cycling) ? d.cycling : 0));

        setLabels(Object.keys(weekData));
        setWalkingData(walkingData);
        setCyclingData(cyclingData);

        const totalWalking = walkingData.reduce((acc, val) => acc + val, 0);
        const totalCycling = cyclingData.reduce((acc, val) => acc + val, 0);

        const walkingPercentage = Math.min((totalWalking / (user.walk_goal || 100)) * 100, 100);
        const cyclingPercentage = Math.min((totalCycling / (user.bic_goal || 100)) * 100, 100);

        setWalkingProgress(walkingPercentage);
        setCyclingProgress(cyclingPercentage);

        // Convert emission and reduction values to percentages
        const emission = Math.max(0.1, totalWalking * 0.5 + totalCycling * 0.2);
        const reduction = Math.max(0.1, totalWalking * 0.3 + totalCycling * 0.1);

        const emissionPercentage = 70  ; // Example: set to 50% manually
        const reductionPercentage = 30 ; // Example: set to 30% manually


        setEmissionData(emissionPercentage);
        setReductionData(reductionPercentage);

      } catch (err) {
        console.error('Failed to load activity data:', err);
      }
    };

    fetchActivityData();
  }, [user]);

  const pieChartData = [
    {
      name: 'Emission',
      population: emissionData,
      color: '#808080', // Grey color
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Reduction',
      population: reductionData,
      color: '#0db760',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
  ];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 183, 96, ${opacity})`,
    labelColor: () => '#666',
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0db760',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0db760" />
        </TouchableOpacity>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {/* LineChart with data validation */}
      {walkingData.length > 0 && cyclingData.length > 0 && (
        <LineChart
          data={{
            labels: labels,
            datasets: [
              {
                data: walkingData,
                color: () => '#0db760',
                strokeWidth: 2,
              },
              {
                data: cyclingData,
                color: () => '#ffa726',
                strokeWidth: 2,
              },
            ],
            legend: ["Walking", "Cycling"]
          }}
          width={screenWidth - 32}
          height={250}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
          fromZero // Ensures chart starts from zero
        />
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Walk progress</Text>
          <Text style={styles.progressValue}>{walkingProgress.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Cycling progress</Text>
          <Text style={styles.progressValue}>{cyclingProgress.toFixed(1)}%</Text>
        </View>
      </View>

      {/* PieChart with data validation */}
      {emissionData > 0 && reductionData > 0 && (
        <View style={styles.pieChartContainer}>
          <Text style={styles.pieChartLabel}>Emission vs Reduction</Text>
          <PieChart
            data={pieChartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: () => '#000',
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute // Shows absolute values instead of percentages
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  backButton: {
    paddingRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0db760',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  progressBox: {
    width: (screenWidth - 64) / 2,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0db760',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  pieChartContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  pieChartLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0db760',
    marginBottom: 10,
  },
});

export default Dashboard;
