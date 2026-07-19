import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { toursAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function ToursScreen({ navigation, route }: any) {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(route?.params?.category || '');
  const [featured, setFeatured] = useState(false);

  const loadTours = () => {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (featured) params.featured = true;
    toursAPI.getAll(params).then(res => {
      setTours(res.data.results || res.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadTours(); }, [category, featured]);

  const categories = ['', 'zanzibar', 'tanzania', 'international'];

  return (
    <View style={styles.container}>
      <View style={globalStyles.pageHeader}>
        <Text style={globalStyles.pageTitle}>Tours</Text>
        <TextInput style={[globalStyles.input, { marginTop: 12 }]} placeholder="Search tours..." value={search}
          onChangeText={setSearch} onSubmitEditing={loadTours} returnKeyType="search" />
      </View>

      <View style={styles.filterRow}>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[styles.filterBtn, category === c && styles.filterBtnActive]}
            onPress={() => setCategory(category === c ? '' : c)}>
            <Text style={[styles.filterText, category === c && styles.filterTextActive]}>{c || 'All'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.filterBtn, featured && styles.filterBtnActive]} onPress={() => setFeatured(!featured)}>
          <Text style={[styles.filterText, featured && styles.filterTextActive]}>Featured</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.aqua} style={{ marginTop: 40 }} /> : (
        <FlatList data={tours} keyExtractor={(item: any) => String(item.id)} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TourDetail', { id: item.id })}>
              <Image source={{ uri: getImageUrl(item.image_url) || '' }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.detail}>📍 {item.destination} | ⏱ {item.duration}</Text>
                <Text style={styles.price}>${item.price} <Text style={{ fontSize: 12, color: colors.textLight }}>/ person</Text></Text>
                {item.average_rating && <Text style={styles.rating}>★ {item.average_rating.toFixed(1)} ({item.review_count})</Text>}
              </View>
            </TouchableOpacity>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  filterBtnActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  card: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  image: { width: 120, height: 120 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  detail: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '700', color: colors.aqua },
  rating: { fontSize: 12, color: colors.starColor, marginTop: 4 },
});
