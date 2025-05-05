import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Calculation from './Calculation';
import EmissonCalculate from './EmissonCalculate';
import ReduceCalculate from './ReduceCalculate';
import Home from './Home';
import SetGoalScreen from './SetGoalScreen';
import Dashboard from './Dashboard'; 

const Stack = createNativeStackNavigator();

const HomeStack = ({ user }: { user: any }) => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Home"
        component={HomeWrapper}
        initialParams={{ user }}
      />
      <Stack.Screen name="Calculation" component={Calculation} />
      <Stack.Screen name="EmissonCalculate" component={EmissonCalculate} />
      <Stack.Screen name="ReduceCalculate" component={ReduceCalculate} />
      <Stack.Screen name="SetGoal" component={SetGoalScreen} />
      <Stack.Screen name="Dashboard" component={Dashboard} /> 
    </Stack.Navigator>
  );
};

const HomeWrapper = ({ route, navigation }: any) => {
  const { user } = route.params;
  return <Home user={user} navigation={navigation} />;
};

export default HomeStack;
