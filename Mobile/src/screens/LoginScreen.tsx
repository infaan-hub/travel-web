import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function LoginScreen({ navigation }: any) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    try {
      await login(form.username, form.password);
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your bookings</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={globalStyles.formGroup}>
            <Text style={globalStyles.inputLabel}>Username</Text>
            <TextInput style={globalStyles.input} placeholder="Enter your username" value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} autoCapitalize="none" />
          </View>
          <View style={globalStyles.formGroup}>
            <Text style={globalStyles.inputLabel}>Password</Text>
            <TextInput style={globalStyles.input} placeholder="Enter your password" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />
          </View>

          <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit}>
            <Text style={globalStyles.btnPrimaryText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Don't have an account? <Text style={{ color: colors.aqua, fontWeight: '600' }}>Create one</Text></Text>
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
