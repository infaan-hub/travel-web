import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/AuthContext';
import Button from '../components/ui/Button';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts } = useTheme();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!phone.trim()) errs.phone = 'Phone is required';
    if (!password.trim()) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(name, email, phone, password);
      router.back();
    } catch {
      setErrors({ email: 'Registration failed' });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>✈️</Text>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Infaan Travel and start your adventure</Text>

          <View style={{ marginTop: 32 }}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.name ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]} value={name} onChangeText={v => { setName(v); setErrors({ ...errors, name: '' }); }} placeholder="John Doe" placeholderTextColor={colors.textTertiary} />
            {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.email ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]} value={email} onChangeText={v => { setEmail(v); setErrors({ ...errors, email: '' }); }} placeholder="john@example.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
            {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Phone Number</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.phone ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]} value={phone} onChangeText={v => { setPhone(v); setErrors({ ...errors, phone: '' }); }} placeholder="+255 712 345 678" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" />
            {errors.phone && <Text style={[styles.errorText, { color: colors.error }]}>{errors.phone}</Text>}

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.password ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]} value={password} onChangeText={v => { setPassword(v); setErrors({ ...errors, password: '' }); }} placeholder="••••••••" placeholderTextColor={colors.textTertiary} secureTextEntry />
            {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>}

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Confirm Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.confirmPassword ? colors.error : colors.border, borderRadius: radius.md, color: colors.text }]} value={confirmPassword} onChangeText={v => { setConfirmPassword(v); setErrors({ ...errors, confirmPassword: '' }); }} placeholder="••••••••" placeholderTextColor={colors.textTertiary} secureTextEntry />
            {errors.confirmPassword && <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword}</Text>}

            <Button title="Create Account" onPress={handleRegister} loading={isLoading} size="lg" style={{ marginTop: 24 }} />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
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
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
