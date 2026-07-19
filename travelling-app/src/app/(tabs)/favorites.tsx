import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useFavorites } from '../../store/FavoritesContext';
import { MOCK_IMAGES } from '../../utils';

const ALL_ITEMS = [
  { id: 'd1', name: 'Zanzibar Beach', country: 'Tanzania', image: MOCK_IMAGES.zanzibar, price: '$450' },
  { id: 'd2', name: 'Serengeti Safari', country: 'Tanzania', image: MOCK_IMAGES.serengeti, price: '$890' },
  { id: 'd3', name: 'Mount Kilimanjaro', country: 'Tanzania', image: MOCK_IMAGES.kilimanjaro, price: '$1,200' },
  { id: 'd4', name: 'Ngorongoro Crater', country: 'Tanzania', image: MOCK_IMAGES.safari, price: '$650' },
  { id: 'd5', name: 'Stone Town', country: 'Zanzibar', image: MOCK_IMAGES.culture, price: '$320' },
  { id: 't1', title: 'Ultimate Tanzania Safari', image: MOCK_IMAGES.serengeti, price: '$2,500' },
  { id: 't2', title: 'Zanzibar Paradise Escape', image: MOCK_IMAGES.beach, price: '$1,800' },
  { id: 't3', title: 'Kilimanjaro Climb', image: MOCK_IMAGES.kilimanjaro, price: '$3,200' },
];

export default function FavoritesScreen() {
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const { favorites, toggleFavorite, clearFavorites } = useFavorites();

  const favoriteItems = useMemo(
    () => ALL_ITEMS.filter(item => favorites.includes(item.id)),
    [favorites]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: 60, paddingHorizontal: spacing.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
          {favoriteItems.length > 0 && (
            <TouchableOpacity onPress={clearFavorites}>
              <Text style={[styles.clearBtn, { color: colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {favoriteItems.length} saved {favoriteItems.length === 1 ? 'destination' : 'destinations'}
        </Text>
      </View>

      {favoriteItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>❤️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start exploring and save your favorite destinations!</Text>
        </View>
      ) : (
        <FlatList
          data={favoriteItems}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, ...shadows.md }]}>
              <Image source={{ uri: item.image }} style={[styles.cardImage, { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]} />
              <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.removeBtn}>
                <Text style={{ fontSize: 18 }}>❤️</Text>
              </TouchableOpacity>
              <View style={[styles.cardBody, { padding: spacing.md }]}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.families.bold }]}>
                  {(item as any).name || (item as any).title}
                </Text>
                {(item as any).country && (
                  <Text style={[styles.cardCountry, { color: colors.textSecondary, fontFamily: fonts.families.regular }]}>
                    📍 {(item as any).country}
                  </Text>
                )}
                <Text style={[styles.cardPrice, { color: colors.primary, fontFamily: fonts.families.bold }]}>
                  {item.price}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  clearBtn: { fontSize: 14, fontWeight: '600' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: { marginBottom: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 180 },
  removeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardBody: {},
  cardTitle: { fontSize: 17 },
  cardCountry: { fontSize: 13, marginTop: 4 },
  cardPrice: { fontSize: 18, marginTop: 8 },
});
