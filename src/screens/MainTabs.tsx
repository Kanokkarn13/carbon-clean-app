import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import ArticleScreen from './ArticleScreen';
import TrackingStack from './TrackingStack';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

type MainTabsProps = {
  user: any;
};

const MainTabs = ({ user }: MainTabsProps) => {
  return (
    <Tab.Navigator id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Article') iconName = 'book';
          else if (route.name === 'Tracking') iconName = 'walk';
          else if (route.name === 'Profile') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        children={() => <HomeStack user={user} />}
      />
      <Tab.Screen name="Article" component={ArticleScreen} />
      <Tab.Screen
        name="Tracking"
        children={() => <TrackingStack user={user} />} // ✅ ใช้ children และส่ง user เป็น props
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ user }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
