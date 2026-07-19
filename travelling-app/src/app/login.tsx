import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/AuthContext';
import Button from '../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!password.trim()) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email, password);
      router.back();
    } catch {
      setErrors({ email: 'Invalid credentials' });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🌍</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue your journey with Infaan Travel</Text>

          <View style={{ marginTop: 32 }}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.email ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]}
              value={email}
              onChangeText={v => { setEmail(v); setErrors({ ...errors, email: '' }); }}
              placeholder="john@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.password ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]}
              value={password}
              onChangeText={v => { setPassword(v); setErrors({ ...errors, password: '' }); }}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
            />
            {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>}

            <View style={styles.row}>
              <TouchableOpacity onPress={() => setRemember(!remember)} style={styles.rememberRow}>
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: remember ? colors.primary : 'transparent' }]}>
                  {remember && <Text style={{ color: colors.white, fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={[styles.rememberText, { color: colors.textSecondary }]}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button title="Sign In" onPress={handleLogin} loading={isLoading} size="lg" style={{ marginTop: 24 }} />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialRow}>
              {['Google', 'Apple', 'Facebook'].map(provider => (
                <TouchableOpacity key={provider} style={[styles.socialBtn, { borderColor: colors.border, borderRadius: radius.md }]}>
                  <Text style={{ fontSize: 16 }}>{provider === 'Google' ? '🔵' : provider === 'Apple' ? '⚫' : '🔷'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/register')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  backBtn: { padding: 24, paddingTop: 60 },
  backText: { fontSize: 16, fontWeight: '600' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 8, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 50, fontSize: 15 },
  errorText: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rememberText: { fontSize: 13 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  socialBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
