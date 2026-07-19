import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { tripsAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function TripsScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tripsAPI.getAll().then(res => setTrips(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Travel Tips</Text>
        <Text style={globalStyles.pageSubtitle}>Tips and guides for your journey</Text>
      </View>
      <FlatList data={trips} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image_url && <Image source={{ uri: getImageUrl(item.image_url) || '' }} style={styles.image} />}
            <View style={styles.info}>
              {item.category ? <View style={styles.category}><Text style={{ color: colors.aqua, fontSize: 11, fontWeight: '700' }}>{item.category}</Text></View> : null}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
              <Text style={styles.author}>{item.author_name ? `By ${item.author_name}` : ''} • {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  image: { width: '100%', height: 160 },
  info: { padding: 16 },
  category: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.aquaSubtle, borderRadius: 8, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  content: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  author: { fontSize: 12, color: colors.textLight },
});
