import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { bookingsAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const statusColors: any = { pending: '#F59E0B', confirmed: '#10B981', cancelled: '#EF4444' };

export default function BookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.getAll().then(res => {
      setBookings(res.data.results || res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>My Bookings</Text>
      </View>
      <FlatList data={bookings} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.tourTitle}>{item.tour_title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColors[item.status]}20` }]}>
                <Text style={{ color: statusColors[item.status], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.details}>
              <Text style={styles.detail}>📅 {item.travel_date}</Text>
              <Text style={styles.detail}>👥 {item.travelers} travelers</Text>
              <Text style={styles.detail}>💰 ${item.total_price || item.travelers * (item.tour_price || 0)}</Text>
            </View>
            {item.status === 'pending' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={async () => { try { await bookingsAPI.cancel(item.id); setBookings(bookings.map((b: any) => b.id === item.id ? { ...b, status: 'cancelled' } : b)); } catch {} }}>
                <Text style={{ color: colors.dangerText, fontSize: 13, fontWeight: '600' }}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tourTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  details: { gap: 4 },
  detail: { fontSize: 13, color: colors.textSecondary },
  cancelBtn: { marginTop: 12, padding: 10, backgroundColor: colors.dangerBg, borderRadius: 12, alignItems: 'center' },
});
