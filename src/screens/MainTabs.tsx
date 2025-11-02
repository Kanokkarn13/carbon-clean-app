import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import ArticleScreen from './ArticleScreen';
import TrackingStack from './TrackingStack';
import ProfileStack from './ProfileStack'; // 

const Tab = createBottomTabNavigator();

type MainTabsProps = { user: any; onLogout: () => void };

const MainTabs: React.FC<MainTabsProps> = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          switch (route.name) {
            case 'Article':
              iconName = 'book';
              break;
            case 'Tracking':
              iconName = 'walk';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
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

      {/* ✅ Pass user through initialParams */}
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        initialParams={{ user, onLogout }} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
