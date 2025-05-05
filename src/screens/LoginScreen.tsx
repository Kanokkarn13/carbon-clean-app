import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { login } from '../services/authService';

type LoginScreenProps = {
  navigation: any;
  route: any;
  onLoginSuccess: (user: any) => void; // ✅ เพิ่ม prop นี้
};

const LoginScreen = ({ navigation, onLoginSuccess }: LoginScreenProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    try {
      console.log('📤 Sending login request...');
      const data = await login(username, password); // สมมุติว่า data มี key `data`
      console.log('✅ Login success', data);

      Alert.alert('Login Success', `Welcome ${data.data.fname} ${data.data.lname}`);

      onLoginSuccess(data.data); // ✅ แจ้ง _layout.tsx เพื่อเซฟ user ลง state
      navigation.navigate('Main');

    } catch (error: any) {
      console.error('❌ Login failed', error.message || error);
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get Started now</Text>
      <Text style={styles.subtitle}>
        Create an account or log in to explore about our app
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <Text style={styles.checkbox}>
              {rememberMe ? '✅' : '⬜️'}
            </Text>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Alert.alert('Reset Password')}>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#888', marginBottom: 24 },
  form: { marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { fontSize: 18 },
  checkboxLabel: { marginLeft: 8, fontSize: 14 },
  forgot: { color: '#007AFF', fontSize: 14 },
  loginButton: { backgroundColor: '#00B386', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default LoginScreen;
