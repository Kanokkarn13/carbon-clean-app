// app/screens/SignupScreen.tsx
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
import { register, saveUser } from '../services/authService';

type SignupScreenProps = {
  navigation: any;
  route: any;
  onSignupSuccess: (user: any) => void;
};

type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: any;   // backend returns user in data (per controller)
  user?: any;   // fallback if some envs return user here
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

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation, onSignupSuccess }) => {
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');      // ✅ required by backend/DB
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [securePw, setSecurePw] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailOk = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.toLowerCase());

  // Your DB column is char(10). Keep exactly 10 digits by default.
  const normalizePhone = (v: string) => v.replace(/\D/g, '').slice(0, 10);
  const phoneOk = (v: string) => normalizePhone(v).length === 10;

  const passwordOk = (v: string) => v.length >= 6;

  const validate = () => {
    if (!fname.trim() || !lname.trim()) {
      setErr('Please enter your first and last name.');
      return false;
    }
    if (!emailOk(email.trim())) {
      setErr('Please enter a valid email address.');
      return false;
    }
    if (!phoneOk(phone)) {
      setErr('Please enter a valid 10-digit phone number.');
      return false;
    }
    if (!passwordOk(password)) {
      setErr('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return false;
    }
    setErr(null);
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const cleanF = fname.trim();
      const cleanL = lname.trim();
      const cleanE = email.trim();
      const cleanP = normalizePhone(phone);

      // ✅ call register with FIVE args (matches authService.ts)
      const res: AuthResponse = await register(cleanF, cleanL, cleanE, password, cleanP);

      if (!res?.success) {
        throw new Error(res?.message || 'Could not create account');
      }

      // Your backend now returns { success, message, data: safeUser }
      const apiUser = res.user ?? res.data;
      if (!apiUser) {
        // If backend wasn’t updated yet, guide user to login
        Alert.alert('Account created', 'Please log in with your new account.');
        navigation.replace('Login');
        return;
      }

      await saveUser(apiUser, res.token);

      const fullName =
        (apiUser.fname || apiUser.lname)
          ? `${apiUser.fname ?? ''} ${apiUser.lname ?? ''}`.trim()
          : 'Welcome';

      Alert.alert('Account created', `Welcome, ${fullName}!`);

      onSignupSuccess(apiUser);
      navigation.replace('Main');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create account';
      setErr(msg);
      Alert.alert('Sign up failed', msg);
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
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Start your carbon journey in minutes
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* First name */}
            <Text style={styles.label}>First name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Jane"
                placeholderTextColor={theme.sub}
                value={fname}
                onChangeText={setFname}
                returnKeyType="next"
              />
            </View>

            {/* Last name */}
            <Text style={[styles.label, { marginTop: 12 }]}>Last name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor={theme.sub}
                value={lname}
                onChangeText={setLname}
                returnKeyType="next"
              />
            </View>

            {/* Email */}
            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.sub}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Phone */}
            <Text style={[styles.label, { marginTop: 12 }]}>Phone</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="0812345678"
                placeholderTextColor={theme.sub}
                value={phone}
                onChangeText={(v) => setPhone(v)}
                keyboardType="phone-pad"
                maxLength={14} // allow spaces/dashes typed; we normalize before submit
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
                secureTextEntry={securePw}
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.suffixBtn}
                onPress={() => setSecurePw(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.suffixText}>
                  {securePw ? 'Show' : 'Hide'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <Text style={[styles.label, { marginTop: 12 }]}>Confirm password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.sub}
                secureTextEntry={secureConfirm}
                value={confirm}
                onChangeText={setConfirm}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.suffixBtn}
                onPress={() => setSecureConfirm(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.suffixText}>
                  {secureConfirm ? 'Show' : 'Hide'}
                </Text>
              </TouchableOpacity>
            </View>

            {err ? <Text style={styles.error}>{err}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={{ color: theme.sub }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: theme.primaryDark, fontWeight: '700' }}>
                  Log in
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
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  label: { color: theme.sub, fontSize: 13, marginBottom: 6 },
  inputWrap: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: '#FFF', position: 'relative' },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: theme.text },
  suffixBtn: { position: 'absolute', right: 8, top: 8, bottom: 8, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F4F6' },
  suffixText: { color: theme.sub, fontWeight: '700', fontSize: 12 },
  error: { color: theme.danger, marginTop: 10, fontWeight: '600' },
  primaryBtn: { marginTop: 16, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footerRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'center' },
});

export default SignupScreen;
