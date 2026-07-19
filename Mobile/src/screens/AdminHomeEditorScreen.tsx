import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { homeSettingsAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminHomeEditorScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeSettingsAPI.get().then(res => setSettings(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.pageTitle}>Home Editor</Text>
      <View style={styles.card}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Hero Image</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{settings?.hero_image_url ? 'Image set' : 'No image'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Zanzibar Image</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{settings?.zanzibar_image_url ? 'Image set' : 'No image'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Tanzania Image</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{settings?.tanzania_image_url ? 'Image set' : 'No image'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
});
