import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { adminAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminDashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats().then(res => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const adminNav = [
    { label: 'Tours', screen: 'AdminTours', icon: '🌍' },
    { label: 'Bookings', screen: 'AdminBookings', icon: '📋' },
    { label: 'Customers', screen: 'AdminCustomers', icon: '👥' },
    { label: 'Reviews', screen: 'AdminReviews', icon: '⭐' },
    { label: 'Attractions', screen: 'AdminAttractions', icon: '🏛️' },
    { label: 'Tips', screen: 'AdminTips', icon: '💡' },
    { label: 'Messages', screen: 'AdminMessages', icon: '✉️' },
    { label: 'Home Editor', screen: 'AdminHomeEditor', icon: '🏠' },
    { label: 'Analytics', screen: 'AdminAnalytics', icon: '📊' },
    { label: 'Settings', screen: 'AdminSettings', icon: '⚙️' },
  ];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.pageTitle}>Admin Dashboard</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats?.total_tours || 0}</Text><Text style={styles.statLab}>Tours</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats?.total_bookings || 0}</Text><Text style={styles.statLab}>Bookings</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats?.total_users || 0}</Text><Text style={styles.statLab}>Users</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats?.total_reviews || 0}</Text><Text style={styles.statLab}>Reviews</Text></View>
      </View>
      <View style={styles.navGrid}>
        {adminNav.map(item => (
          <TouchableOpacity key={item.screen} style={styles.navItem} onPress={() => navigation.navigate(item.screen)}>
            <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  statNum: { fontSize: 24, fontWeight: '700', color: colors.aqua },
  statLab: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  navItem: { width: '30%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  navLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
});
