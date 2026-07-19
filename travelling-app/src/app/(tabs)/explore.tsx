import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, FlatList, Dimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useFavorites } from '../../store/FavoritesContext';
import Card from '../../components/ui/Card';
import { MOCK_IMAGES } from '../../utils';

const { width } = Dimensions.get('window');

const ALL_DESTINATIONS = [
  { id: 'd1', name: 'Zanzibar Beach', country: 'Tanzania', image: MOCK_IMAGES.zanzibar, price: 450, duration: '5 Days', rating: 4.8, description: 'Pristine beaches, spice farms, and rich Swahili culture.' },
  { id: 'd2', name: 'Serengeti Safari', country: 'Tanzania', image: MOCK_IMAGES.serengeti, price: 890, duration: '7 Days', rating: 4.9, description: 'Witness the Great Migration.' },
  { id: 'd3', name: 'Mount Kilimanjaro', country: 'Tanzania', image: MOCK_IMAGES.kilimanjaro, price: 1200, duration: '8 Days', rating: 4.7, description: 'Conquer Africa\'s highest peak.' },
  { id: 'd4', name: 'Ngorongoro Crater', country: 'Tanzania', image: MOCK_IMAGES.safari, price: 650, duration: '4 Days', rating: 4.9, description: 'UNESCO World Heritage site.' },
  { id: 'd5', name: 'Stone Town', country: 'Zanzibar', image: MOCK_IMAGES.culture, price: 320, duration: '3 Days', rating: 4.6, description: 'Historic heart of Zanzibar.' },
  { id: 'd6', name: 'Lake Manyara', country: 'Tanzania', image: MOCK_IMAGES.sunset, price: 550, duration: '3 Days', rating: 4.5, description: 'Tree-climbing lions.' },
  { id: 'd7', name: 'Dar es Salaam', country: 'Tanzania', image: MOCK_IMAGES.destination1, price: 280, duration: '4 Days', rating: 4.4, description: 'Largest city in Tanzania.' },
  { id: 'd8', name: 'Arusha National Park', country: 'Tanzania', image: MOCK_IMAGES.destination2, price: 480, duration: '3 Days', rating: 4.6, description: 'Stunning landscapes.' },
  { id: 'd9', name: 'Tarangire National Park', country: 'Tanzania', image: MOCK_IMAGES.destination3, price: 520, duration: '4 Days', rating: 4.7, description: 'Famous for elephant herds.' },
  { id: 'd10', name: 'Mafia Island', country: 'Tanzania', image: MOCK_IMAGES.destination4, price: 680, duration: '5 Days', rating: 4.8, description: 'Diving paradise.' },
  { id: 'd11', name: 'Selous Game Reserve', country: 'Tanzania', image: MOCK_IMAGES.destination5, price: 750, duration: '6 Days', rating: 4.5, description: 'Africa\'s largest reserve.' },
  { id: 'd12', name: 'Pemba Island', country: 'Zanzibar', image: MOCK_IMAGES.destination6, price: 390, duration: '4 Days', rating: 4.3, description: 'Undeveloped paradise.' },
];

const CATEGORIES = ['All', 'Beach', 'Safari', 'Mountain', 'Culture', 'Luxury', 'Adventure'];
const SORT_OPTIONS = ['Popular', 'Price: Low', 'Price: High', 'Rating', 'Duration'];

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('Popular');

  const filtered = ALL_DESTINATIONS
    .filter(d => selectedCat === 'All' || d.name.toLowerCase().includes(selectedCat.toLowerCase()))
    .filter(d => search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase()) : true)
    .sort((a, b) => {
      switch (sortBy) {
        case 'Price: Low': return a.price - b.price;
        case 'Price: High': return b.price - a.price;
        case 'Rating': return b.rating - a.rating;
        default: return 0;
      }
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderRadius: radius.lg, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Search destinations..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text, fontFamily: fonts.families.regular }]}
          />
          <TouchableOpacity onPress={() => setShowSort(!showSort)}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCat(cat)}
              style={[
                styles.categoryChip,
                { backgroundColor: selectedCat === cat ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.categoryChipText, { color: selectedCat === cat ? colors.white : colors.textSecondary, fontFamily: fonts.families.medium }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {showSort && (
          <View style={[styles.sortDropdown, { backgroundColor: colors.surface, ...shadows.lg, borderColor: colors.border }]}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} onPress={() => { setSortBy(opt); setShowSort(false); }} style={[styles.sortOption, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sortOptionText, { color: sortBy === opt ? colors.primary : colors.text, fontFamily: fonts.families.medium }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <Card
            image={item.image}
            title={item.name}
            subtitle={item.description}
            price={item.price}
            duration={item.duration}
            rating={item.rating}
            onPress={() => {}}
            onFavorite={() => toggleFavorite(item.id)}
            isFavorite={isFavorite(item.id)}
            style={{ flex: 1, marginHorizontal: 6 }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No destinations found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  categoriesRow: { gap: 8, marginTop: 16, paddingBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  sortDropdown: { position: 'absolute', top: 180, right: 20, zIndex: 100, borderRadius: 12, borderWidth: 1, overflow: 'hidden', ...Platform.select({ web: { position: 'absolute', zIndex: 100 } }) },
  sortOption: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  sortOptionText: { fontSize: 14 },
  grid: { padding: 12 },
  gridRow: { gap: 12, marginBottom: 0 },
  empty: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
