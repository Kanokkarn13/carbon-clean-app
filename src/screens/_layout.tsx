import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from '../screens/MainTabs';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined; // ✅ ไม่ต้องส่ง user ผ่าน param แล้ว เพราะใช้ state
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Layout() {
  const [user, setUser] = useState(null); // ✅ เก็บ user หลัง login

  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {/* ✅ ส่ง onLoginSuccess ผ่าน props */}
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              {...props}
              onLoginSuccess={(data) => setUser(data)}
            />
          )}
        </Stack.Screen>

        {/* ✅ ส่ง user เข้า MainTabs ผ่าน children แบบฟังก์ชัน */}
        <Stack.Screen name="Main">
          {(props) => <MainTabs {...props} user={user} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
