import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackingScreen from './TrackingScreen';
import CarbonOffsetScreen from './carbonoffsetScreen';

const Stack = createNativeStackNavigator();

type TrackingStackProps = {
  user: any;
};

const TrackingStack: React.FC<TrackingStackProps> = ({ user }) => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="TrackingScreen"
        children={() => <TrackingScreen user={user} />}
      />
      <Stack.Screen name="CarbonOffsetScreen" component={CarbonOffsetScreen} />
    </Stack.Navigator>
  );
};

export default TrackingStack;
