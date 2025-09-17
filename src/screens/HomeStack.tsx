// src/screens/HomeStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from './Home';
import Calculation from './Calculation';
import EmissonCalculate from './EmissonCalculate';
import ReduceCalculate from './ReduceCalculate';
import SetGoalScreen from './SetGoalScreen';
import Dashboard from './Dashboard';
import RecentAct from './RecentAct'; // ✅ เพิ่มหน้ารายละเอียดกิจกรรม

// -------- Activity Types (ประกาศในไฟล์นี้เลยเพื่อเลี่ยง error import วน) --------
export type ActivityType = 'Cycling' | 'Walking';

export type Activity = {
  type: ActivityType;
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date;
  id?: string | number;
};

// -------- User / Navigation Types --------
export type User = {
  user_id?: string | number;
  id?: string | number;
  fname?: string;
  lname?: string;
  email?: string;
};

export type RootStackParamList = {
  Home: { user?: User } | undefined;
  Calculation: { user?: User } | undefined;
  EmissonCalculate: { user?: User } | undefined;
  ReduceCalculate: { user?: User } | undefined;
  SetGoal: { user?: User } | undefined;
  Dashboard: { user?: User } | undefined;
  RecentAct: { activity: Activity } | undefined; // ✅ ใช้ชนิด Activity ที่นิยามด้านบน
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type HomeStackProps = { user?: User };

const HomeStack: React.FC<HomeStackProps> = ({ user }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* ส่ง user เป็น prop ตรง ๆ ให้ Home */}
      <Stack.Screen name="Home">
        {(props) => <Home {...props} user={user} />}
      </Stack.Screen>

      {/* ที่เหลือใช้ initialParams เพื่อให้ทุกหน้ามี user ติดไปด้วย */}
      <Stack.Screen
        name="Calculation"
        component={Calculation}
        initialParams={{ user }}
      />
      <Stack.Screen
        name="EmissonCalculate"
        component={EmissonCalculate}
        initialParams={{ user }}
      />
      <Stack.Screen
        name="ReduceCalculate"
        component={ReduceCalculate}
        initialParams={{ user }}
      />
      <Stack.Screen
        name="SetGoal"
        component={SetGoalScreen}
        initialParams={{ user }}
      />
      <Stack.Screen
        name="Dashboard"
        component={Dashboard}
        initialParams={{ user }}
      />

      {/* ✅ ลงทะเบียนหน้ารายละเอียดกิจกรรม */}
      <Stack.Screen name="RecentAct" component={RecentAct} />
    </Stack.Navigator>
  );
};

export default HomeStack;
