// src/screens/HomeStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from './Home';
import Calculation from './Calculation';
import EmissonCalculate from './EmissonCalculate';
import ReduceCalculate from './ReduceCalculate';
import SetGoalScreen from './SetGoalScreen';
import Dashboard from './Dashboard';
import RewardScreen from './RewardScreen';
import RewardDetail from './RewardDetail';
import RedeemHistoryScreen from './RedeemHistoryScreen';
import type { Reward } from '../services/rewardService';
import RecentAct from './RecentAct'; // ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡

// -------- Activity Types (ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¸ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ error import ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢) --------
export type ActivityType = 'Cycling' | 'Walking';

export type Activity = {
  type: ActivityType;
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date | number;
  id?: string | number;
  points?: number;
  points_valid?: boolean;
  points_reason?: string | null;
  carbonReduce?: number;
  carbon_reduce_kg?: number;
  carbon_reduce_g?: number;
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
  RedeemHistory: { user?: User } | undefined;
  RecentAct: { activity: Activity } | undefined;
  Reward: { user?: User; totalPoints?: number; activities?: Activity[] } | undefined;
  RewardDetail:
    | {
        reward: Reward & {
          highlightColor?: string;
          logoColor?: string;
          logoLetter?: string;
          logoUrl?: string | null;
        };
        user?: User;
        totalPoints?: number;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type HomeStackProps = { user?: User };

const HomeStack: React.FC<HomeStackProps> = ({ user }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Home screen; pass user prop through */}
      <Stack.Screen name="Home">
        {(props) => <Home {...props} user={user} />}
      </Stack.Screen>

      {/* Calculation and goal flows keep user in initial params */}
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

      <Stack.Screen
        name="RedeemHistory"
        component={RedeemHistoryScreen}
        initialParams={{ user }}
      />

      {/* Reward redemption flow */}
      <Stack.Screen
        name="Reward"
        component={RewardScreen}
        initialParams={{ user }}
      />
      <Stack.Screen name="RewardDetail" component={RewardDetail} />
      <Stack.Screen name="RecentAct" component={RecentAct} />
    </Stack.Navigator>
  );
};

export default HomeStack;
