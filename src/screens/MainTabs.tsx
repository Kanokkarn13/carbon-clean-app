import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import ArticleScreen from './ArticleScreen';
import TrackingStack from './TrackingStack';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

type MainTabsProps = { user: any };

const MainTabs: React.FC<MainTabsProps> = ({ user }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Article') iconName = 'book';
          else if (route.name === 'Tracking') iconName = 'walk';
          else if (route.name === 'Profile') iconName = 'person';
          else iconName = 'home';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* ✅ เปลี่ยนชื่อแท็บเป็น HomeTab เพื่อเลี่ยง warning "Home > Home > Home" */}
      <Tab.Screen
        name="HomeTab"
        children={() => <HomeStack user={user} />}
        options={{ title: 'Home' }}
      />

      <Tab.Screen name="Article" component={ArticleScreen} />

      <Tab.Screen
        name="Tracking"
        children={() => <TrackingStack user={user} />}
      />

      {/* Profile ปัจจุบันอ่านจาก route.params.user
         ระหว่างเซสชัน user จะไม่เปลี่ยนอยู่แล้ว ใช้ initialParams ได้ */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ user }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
