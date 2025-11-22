// app/navigation/Layout.tsx (or wherever this file lives)
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MainTabs from '../screens/MainTabs';
import { getUser } from '../services/authService';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined; // using lifted state instead of params
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await getUser();
        if (mounted && stored) {
          setUser(stored);
        }
      } catch (err) {
        console.warn('Failed to restore user session:', err);
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthSuccess = useCallback((data: any) => {
    setUser(data);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  if (bootstrapping) {
    return (
      <NavigationContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#07F890" />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? 'Main' : 'Login'}
      >
        {/* Login */}
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              {...props}
              onLoginSuccess={handleAuthSuccess}
            />
          )}
        </Stack.Screen>

        {/* Signup */}
        <Stack.Screen name="Signup">
          {(props) => (
            <SignupScreen
              {...props}
              onSignupSuccess={handleAuthSuccess}
            />
          )}
        </Stack.Screen>

        {/* Main (authenticated) */}
        <Stack.Screen name="Main">
          {(props) => <MainTabs {...props} user={user} onLogout={handleLogout} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
