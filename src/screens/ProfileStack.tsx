import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from './ProfileScreen';
import ProfileEdit from './ProfileEdit';

const Stack = createNativeStackNavigator();

export default function ProfileStack({ route }: any) {
  const user = route?.params?.user ?? null; // safe access
  const onLogout = route?.params?.onLogout;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        initialParams={{ user, onLogout }} // ensures ProfileScreen always has user and logout handler
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEdit}
        options={{
          title: 'Edit Profile',
          headerTintColor: '#07F890',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
