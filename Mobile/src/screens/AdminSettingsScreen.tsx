import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { authAPI, profileAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminSettingsScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await authAPI.updateUser(form);
      Alert.alert('Success', 'Settings saved');
    } catch { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.pageTitle}>Settings</Text>
      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Username</Text><TextInput style={globalStyles.input} value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} /></View>
      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Email</Text><TextInput style={globalStyles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} /></View>
      <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit} disabled={saving}>
        <Text style={globalStyles.btnPrimaryText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
});
