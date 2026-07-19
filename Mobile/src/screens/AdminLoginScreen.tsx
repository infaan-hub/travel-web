import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminLoginScreen({ navigation }: any) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    try {
      const user = await login(form.username, form.password);
      if (!user.is_staff) { setError('Admin access required'); return; }
    } catch { setError('Invalid admin credentials'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Admin Login</Text>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Username</Text><TextInput style={globalStyles.input} value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Password</Text><TextInput style={globalStyles.input} value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry /></View>
          <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit}><Text style={globalStyles.btnPrimaryText}>Sign In</Text></TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate('AdminRegister')}><Text style={{ textAlign: 'center', color: colors.textSecondary }}>Register as Admin</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bgSolid },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  title: { fontSize: 28, fontWeight: '700', color: colors.aqua, textAlign: 'center', marginBottom: 24 },
  errorBox: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 14, marginBottom: 16 },
  errorText: { color: colors.dangerText, fontSize: 14 },
});
