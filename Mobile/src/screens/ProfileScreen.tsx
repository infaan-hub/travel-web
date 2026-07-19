import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { profileAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    profileAPI.get().then(res => {
      setProfile(res.data);
      setForm({ full_name: res.data.full_name || '', email: res.data.email || user?.email || '', phone: res.data.phone || '', address: res.data.address || '' });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('address', form.address);
      const res = await profileAPI.update(fd);
      setProfile(res.data);
      Alert.alert('Success', 'Profile updated');
    } catch { Alert.alert('Error', 'Failed to save profile'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Settings</Text>
        <Text style={globalStyles.pageSubtitle}>Manage your profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {profile?.profile_image ? (
            <Image source={{ uri: profile.profile_image }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{form.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}</Text>
          )}
        </View>
      </View>

      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Full Name</Text><TextInput style={globalStyles.input} value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} /></View>
      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Email</Text><TextInput style={globalStyles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" /></View>
      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Phone</Text><TextInput style={globalStyles.input} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" /></View>
      <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Address</Text><TextInput style={globalStyles.input} value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} multiline /></View>

      <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSave} disabled={saving}>
        <Text style={globalStyles.btnPrimaryText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[globalStyles.btnDanger, globalStyles.btnBlock, { marginTop: 16 }]} onPress={logout}>
        <Text style={globalStyles.btnDangerText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.aqua, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(0,212,216,0.3)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
});
