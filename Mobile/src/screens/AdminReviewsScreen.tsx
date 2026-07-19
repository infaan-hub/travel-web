import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { reviewsAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = (status = '') => {
    const params: any = {};
    if (status) params.status = status;
    reviewsAPI.getAll(params).then(res => setReviews(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = (id: number, status: string) => {
    reviewsAPI.approve(id, { status }).then(() => load());
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Reviews</Text>
        <View style={styles.filterRow}>
          {['', 'pending', 'approved', 'deleted'].map(s => (
            <TouchableOpacity key={s} style={styles.filterBtn} onPress={() => load(s)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' }}>{s || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList data={reviews} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={{ fontWeight: '600' }}>{item.user_name || 'Anonymous'}</Text>
              <View style={[styles.badge, { backgroundColor: item.status === 'approved' ? colors.successBg : item.status === 'pending' ? colors.warningBg : colors.dangerBg }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.status === 'approved' ? colors.successText : item.status === 'pending' ? colors.warningText : colors.dangerText, textTransform: 'capitalize' }}>{item.status}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginVertical: 4 }}>
              {Array.from({ length: 5 }, (_, i) => <Text key={i} style={{ color: i < item.rating ? colors.starColor : colors.starEmpty }}>★</Text>)}
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.content}</Text>
            <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>{item.tour_title ? `Tour: ${item.tour_title}` : ''}</Text>
            <View style={styles.actions}>
              {item.status !== 'approved' && <TouchableOpacity onPress={() => updateStatus(item.id, 'approved')}><Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>Approve</Text></TouchableOpacity>}
              {item.status !== 'deleted' && <TouchableOpacity onPress={() => updateStatus(item.id, 'deleted')}><Text style={{ color: colors.dangerText, fontWeight: '600', fontSize: 13 }}>Reject</Text></TouchableOpacity>}
            </View>
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
});
