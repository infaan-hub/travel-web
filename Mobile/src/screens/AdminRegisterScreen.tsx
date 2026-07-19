import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminRegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { adminRegister } = useAuth();

  const handleSubmit = async () => {
    setError('');
    try {
      await adminRegister(form.username, form.email, form.password);
      Alert.alert('Success', 'Admin registered! Please login.');
      navigation.navigate('AdminLogin');
    } catch { setError('Registration failed'); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Register</Text>
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Username</Text><TextInput style={globalStyles.input} value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} /></View>
        <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Email</Text><TextInput style={globalStyles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} /></View>
        <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Password</Text><TextInput style={globalStyles.input} value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry /></View>
        <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit}><Text style={globalStyles.btnPrimaryText}>Register</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bgSolid },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  title: { fontSize: 28, fontWeight: '700', color: colors.aqua, textAlign: 'center', marginBottom: 24 },
  errorBox: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 14, marginBottom: 16 },
  errorText: { color: colors.dangerText, fontSize: 14 },
});
