import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { adminAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const statusColors: any = { pending: '#F59E0B', confirmed: '#10B981', cancelled: '#EF4444' };

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => adminAPI.getAllBookings().then(res => setBookings(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const updateStatus = (id: number, status: string) => {
    adminAPI.updateBookingStatus(id, status).then(load);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}><Text style={globalStyles.pageTitle}>All Bookings</Text></View>
      <FlatList data={bookings} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={{ fontWeight: '600' }}>{item.full_name}</Text>
              <View style={[styles.badge, { backgroundColor: `${statusColors[item.status]}20` }]}>
                <Text style={{ color: statusColors[item.status], fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.detail}>Tour: {item.tour_title}</Text>
            <Text style={styles.detail}>Date: {item.travel_date} | Travelers: {item.travelers}</Text>
            <Text style={styles.detail}>Email: {item.email} | Phone: {item.phone}</Text>
            <View style={styles.actions}>
              {item.status !== 'confirmed' && <TouchableOpacity onPress={() => updateStatus(item.id, 'confirmed')} style={styles.actionBtn}><Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>Confirm</Text></TouchableOpacity>}
              {item.status !== 'cancelled' && <TouchableOpacity onPress={() => updateStatus(item.id, 'cancelled')} style={styles.actionBtn}><Text style={{ color: colors.dangerText, fontWeight: '600', fontSize: 13 }}>Cancel</Text></TouchableOpacity>}
              <TouchableOpacity onPress={() => { adminAPI.deleteBooking(item.id).then(load); }} style={styles.actionBtn}><Text style={{ color: colors.dangerText, fontWeight: '600', fontSize: 13 }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  detail: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionBtn: { padding: 4 },
});
