import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { attractionsAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function AttractionsScreen({ navigation }: any) {
  const [attractions, setAttractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (region) params.region = region;
    attractionsAPI.getAll(params).then(res => {
      setAttractions(res.data.results || res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [region]);

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Attractions</Text>
      </View>
      <View style={styles.filterRow}>
        {['', 'Zanzibar', 'Arusha', 'Serengeti'].map(r => (
          <TouchableOpacity key={r} style={[styles.filterBtn, region === r && styles.filterActive]} onPress={() => setRegion(region === r ? '' : r)}>
            <Text style={[styles.filterText, region === r && styles.filterTextActive]}>{r || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.aqua} style={{ marginTop: 40 }} /> : (
        <FlatList data={attractions} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: getImageUrl(item.image_url) || '' }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.detail}>{item.location}</Text>
                {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
                {item.best_time_to_visit ? <Text style={styles.meta}>🕐 {item.best_time_to_visit}</Text> : null}
              </View>
            </View>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  filterActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  image: { width: '100%', height: 160 },
  info: { padding: 16 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  detail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  desc: { fontSize: 13, color: colors.textPrimary, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
});
