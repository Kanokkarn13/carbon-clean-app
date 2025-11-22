// app/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, saveUser } from '../services/authService';

type LoginScreenProps = {
  navigation: any;
  route: any;
  onLoginSuccess: (user: any) => void;
};

type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: any;    // backend sends user in data
  user?: any;    // fallback if backend sends user directly
  token?: string;
};

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  danger: '#EF4444',
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validate = () => {
    if (!username.trim() || !password) {
      setErr('Please enter your email and password.');
      return false;
    }
    setErr(null);
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res: AuthResponse = await login(username.trim(), password);

      const apiUser = res.user ?? res.data;
      if (!apiUser) {
        throw new Error(res.message || 'Malformed login response');
      }

      await saveUser(apiUser, res.token);
      setErr(null);
      onLoginSuccess(apiUser);
      navigation.replace('Main');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid credentials';
      setErr(msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Get started</Text>
            <Text style={styles.subtitle}>
              Log in to continue your carbon journey
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.sub}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.sub}
                secureTextEntry={secure}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.suffixBtn}
                onPress={() => setSecure((s) => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.suffixText}>
                  {secure ? 'Show' : 'Hide'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert('Reset Password', 'Password reset flow goes here.')}
              style={{ marginTop: 12, alignSelf: 'flex-end' }}
            >
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            {err ? <Text style={styles.error}>{err}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Log in</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={{ color: theme.sub }}>Don’t have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={{ color: theme.primaryDark, fontWeight: '700' }}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 40, flex: 1, justifyContent: 'center' },
  header: { marginBottom: 12, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.sub, marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: { color: theme.sub, fontSize: 13, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.text,
  },
  suffixBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    bottom: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  suffixText: { color: theme.sub, fontWeight: '700', fontSize: 12 },
  forgot: { color: theme.primaryDark, fontWeight: '700' },
  error: { color: theme.danger, marginTop: 10, fontWeight: '600' },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footerRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'center' },
});

export default LoginScreen;
