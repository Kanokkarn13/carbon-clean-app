import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from './ProfileScreen';
import ProfileEdit from './ProfileEdit';

const Stack = createNativeStackNavigator();

export default function ProfileStack({ route }: any) {
  const user = route?.params?.user ?? null; // ✅ safe access

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        initialParams={{ user }} // ✅ ensures ProfileScreen always has user
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEdit}
        options={{
          title: 'Edit Profile',
          headerTintColor: '#22C55E',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
