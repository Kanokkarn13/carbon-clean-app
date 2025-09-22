// app/navigation/Layout.tsx (or wherever this file lives)
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MainTabs from '../screens/MainTabs';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined; // using lifted state instead of params
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  const [user, setUser] = useState<any>(null);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        {/* Login */}
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              {...props}
              onLoginSuccess={(data) => setUser(data)}
            />
          )}
        </Stack.Screen>

        {/* Signup */}
        <Stack.Screen name="Signup">
          {(props) => (
            <SignupScreen
              {...props}
              onSignupSuccess={(data) => setUser(data)}
            />
          )}
        </Stack.Screen>

        {/* Main (authenticated) */}
        <Stack.Screen name="Main">
          {(props) => <MainTabs {...props} user={user} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
