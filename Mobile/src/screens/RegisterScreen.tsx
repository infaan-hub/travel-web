import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleSubmit = async () => {
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    try {
      await register(form.username, form.email, form.password);
      Alert.alert('Success', 'Registration successful! Please sign in.');
      navigation.navigate('Login');
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your adventure</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Username *</Text><TextInput style={globalStyles.input} placeholder="Choose a username" value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} autoCapitalize="none" /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Email *</Text><TextInput style={globalStyles.input} placeholder="your@email.com" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Password *</Text><TextInput style={globalStyles.input} placeholder="Create a strong password" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Confirm Password *</Text><TextInput style={globalStyles.input} placeholder="Confirm your password" value={form.confirmPassword} onChangeText={(t) => setForm({ ...form, confirmPassword: t })} secureTextEntry /></View>

          <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit}>
            <Text style={globalStyles.btnPrimaryText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? <Text style={{ color: colors.aqua, fontWeight: '600' }}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bgSolid },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  title: { fontSize: 28, fontWeight: '700', color: colors.aqua, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  errorBox: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  errorText: { color: colors.dangerText, fontSize: 14 },
  link: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
});
