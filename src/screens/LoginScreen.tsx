import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { login } from '../services/authService';

type LoginScreenProps = {
  navigation: any;
  route: any;
  onLoginSuccess: (user: any) => void;
};

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
  danger: '#EF4444',
};

const LoginScreen = ({ navigation, onLoginSuccess }: LoginScreenProps) => {
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
      const data = await login(username.trim(), password);
      Alert.alert('Welcome', `${data.data.fname} ${data.data.lname}`);
      onLoginSuccess(data.data);
      navigation.replace('Main');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Invalid credentials';
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
                onPress={() => setSecure(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.suffixText}>
                  {secure ? 'Show' : 'Hide'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Reset Password', 'Password reset flow goes here.')
              }
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
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flex: 1,
    justifyContent: 'center',
  },
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
  footerRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default LoginScreen;
