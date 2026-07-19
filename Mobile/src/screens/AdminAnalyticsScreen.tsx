import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { adminAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminAnalyticsScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats().then(res => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.pageTitle}>Analytics</Text>
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_tours || 0}</Text><Text style={styles.lab}>Total Tours</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_bookings || 0}</Text><Text style={styles.lab}>Bookings</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_users || 0}</Text><Text style={styles.lab}>Users</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_reviews || 0}</Text><Text style={styles.lab}>Reviews</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_attractions || 0}</Text><Text style={styles.lab}>Attractions</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_tips || 0}</Text><Text style={styles.lab}>Tips</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.pending_bookings || 0}</Text><Text style={styles.lab}>Pending</Text></View>
        <View style={styles.card}><Text style={[styles.num, { color: '#10B981' }]}>{stats?.confirmed_bookings || 0}</Text><Text style={styles.lab}>Confirmed</Text></View>
        <View style={styles.card}><Text style={[styles.num, { color: '#EF4444' }]}>{stats?.cancelled_bookings || 0}</Text><Text style={styles.lab}>Cancelled</Text></View>
        <View style={styles.card}><Text style={styles.num}>{stats?.total_visitors || 0}</Text><Text style={styles.lab}>Visitors</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  card: { width: '46%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  num: { fontSize: 28, fontWeight: '700', color: colors.aqua, marginBottom: 4 },
  lab: { fontSize: 12, color: colors.textSecondary },
});
