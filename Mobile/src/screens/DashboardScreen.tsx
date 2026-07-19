import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { customerAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function DashboardScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerAPI.getDashboard().then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>My Dashboard</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{data?.total_bookings || 0}</Text><Text style={styles.statLabel}>Total Bookings</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, { color: colors.starColor }]}>{data?.pending_bookings || 0}</Text><Text style={styles.statLabel}>Pending</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, { color: '#10B981' }]}>{data?.confirmed_bookings || 0}</Text><Text style={styles.statLabel}>Confirmed</Text></View>
      </View>
      {data?.recent_bookings?.length > 0 && (
        <>
          <Text style={[globalStyles.sectionTitle, { marginBottom: 12 }]}>Recent Bookings</Text>
          {data.recent_bookings.map((b: any, i: number) => (
            <View key={i} style={styles.bookingCard}>
              <Text style={{ fontWeight: '600' }}>{b.tour_title}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{b.travel_date} • {b.travelers} travelers</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  statNumber: { fontSize: 28, fontWeight: '700', color: colors.aqua, marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  bookingCard: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
});
