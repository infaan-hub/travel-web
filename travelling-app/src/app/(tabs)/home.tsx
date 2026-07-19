import { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, TextInput, FlatList, Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useFavorites } from '../../store/FavoritesContext';
import Card from '../../components/ui/Card';
import { formatPrice, MOCK_IMAGES } from '../../utils';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'Beach', icon: '🏖️', color: '#E3F2FD' },
  { id: '2', name: 'Safari', icon: '🦁', color: '#FFF3E0' },
  { id: '3', name: 'Mountain', icon: '⛰️', color: '#E8F5E9' },
  { id: '4', name: 'Culture', icon: '🏛️', color: '#FCE4EC' },
  { id: '5', name: 'Luxury', icon: '✨', color: '#F3E5F5' },
  { id: '6', name: 'Adventure', icon: '🧗', color: '#E0F2F1' },
];

const DESTINATIONS = [
  { id: 'd1', name: 'Zanzibar Beach', country: 'Tanzania', image: MOCK_IMAGES.zanzibar, price: 450, duration: '5 Days', rating: 4.8, description: 'Pristine beaches, spice farms, and rich Swahili culture.' },
  { id: 'd2', name: 'Serengeti Safari', country: 'Tanzania', image: MOCK_IMAGES.serengeti, price: 890, duration: '7 Days', rating: 4.9, description: 'Witness the Great Migration and Africa\'s Big Five.' },
  { id: 'd3', name: 'Mount Kilimanjaro', country: 'Tanzania', image: MOCK_IMAGES.kilimanjaro, price: 1200, duration: '8 Days', rating: 4.7, description: 'Conquer Africa\'s highest peak.' },
  { id: 'd4', name: 'Ngorongoro Crater', country: 'Tanzania', image: MOCK_IMAGES.safari, price: 650, duration: '4 Days', rating: 4.9, description: 'UNESCO World Heritage site with incredible wildlife.' },
  { id: 'd5', name: 'Stone Town', country: 'Zanzibar', image: MOCK_IMAGES.culture, price: 320, duration: '3 Days', rating: 4.6, description: 'Explore the historic heart of Zanzibar.' },
  { id: 'd6', name: 'Lake Manyara', country: 'Tanzania', image: MOCK_IMAGES.sunset, price: 550, duration: '3 Days', rating: 4.5, description: 'Famous for tree-climbing lions and flamingos.' },
];

const FEATURED_TOURS = [
  { id: 't1', title: 'Ultimate Tanzania Safari', image: MOCK_IMAGES.serengeti, price: 2500, duration: '12 Days', rating: 5.0, description: 'The complete Tanzanian experience.' },
  { id: 't2', title: 'Zanzibar Paradise Escape', image: MOCK_IMAGES.beach, price: 1800, duration: '7 Days', rating: 4.8, description: 'Relax on the pristine beaches of Zanzibar.' },
  { id: 't3', title: 'Kilimanjaro Climb', image: MOCK_IMAGES.kilimanjaro, price: 3200, duration: '10 Days', rating: 4.9, description: 'Summit Africa\'s highest mountain.' },
];

const REVIEWS = [
  { id: 'r1', name: 'Sarah Johnson', avatar: MOCK_IMAGES.avatar2, rating: 5, text: 'Absolutely incredible experience! The safari was beyond my wildest dreams.' },
  { id: 'r2', name: 'Michael Chen', avatar: MOCK_IMAGES.avatar3, rating: 5, text: 'Infaan Travel made our honeymoon unforgettable. Every detail was perfect.' },
  { id: 'r3', name: 'Emma Williams', avatar: MOCK_IMAGES.avatar, rating: 4, text: 'Professional, responsive, and knowledgeable. Highly recommend!' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scrollRef = useRef<ScrollView>(null);

  const renderHeader = () => (
    <View style={[styles.heroContainer, { backgroundColor: colors.primary }]}>
      <Image source={{ uri: MOCK_IMAGES.hero }} style={[styles.heroImage]} />
      <View style={[styles.heroOverlay, { backgroundColor: colors.overlay }]} />
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>Explore The World</Text>
        <Text style={styles.heroSubtitle}>Travel Smarter with Infaan Travel</Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={[styles.heroBtn, styles.heroBtnPrimary]}>
            <Text style={styles.heroBtnText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroBtn, styles.heroBtnSecondary]}>
            <Text style={[styles.heroBtnText, { color: colors.white }]}>Explore Packages</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSearch = () => (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderRadius: radius.xl, ...shadows.lg, marginTop: -30, marginHorizontal: spacing.lg }]}>
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
            <TextInput
              placeholder="Search destinations..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text, fontFamily: fonts.families.regular }]}
            />
          </View>
          <View style={styles.searchFilters}>
            <View style={styles.filterChip}>
              <Text style={[styles.filterChipText, { color: colors.textSecondary }]}>📅 Any Date</Text>
            </View>
            <View style={styles.filterChip}>
              <Text style={[styles.filterChipText, { color: colors.textSecondary }]}>👥 2 Guests</Text>
            </View>
            <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.searchBtnText, { fontFamily: fonts.families.bold }]}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id} style={[styles.categoryCard, { backgroundColor: cat.color }]}>
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDestinations = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Destinations</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationsRow}>
        {DESTINATIONS.slice(0, 5).map(dest => (
          <Card
            key={dest.id}
            image={dest.image}
            title={dest.name}
            subtitle={dest.description}
            price={dest.price}
            duration={dest.duration}
            rating={dest.rating}
            onPress={() => {}}
            onFavorite={() => toggleFavorite(dest.id)}
            isFavorite={isFavorite(dest.id)}
            compact
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderFeatured = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Tours</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      {FEATURED_TOURS.map(tour => (
        <Card
          key={tour.id}
          image={tour.image}
          title={tour.title}
          subtitle={tour.description}
          price={tour.price}
          duration={tour.duration}
          rating={tour.rating}
          onPress={() => {}}
          onFavorite={() => toggleFavorite(tour.id)}
          isFavorite={isFavorite(tour.id)}
        />
      ))}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What Travelers Say</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewsRow}>
        {REVIEWS.map(review => (
          <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderRadius: radius.lg, ...shadows.sm }]}>
            <View style={styles.reviewHeader}>
              <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
              <View>
                <Text style={[styles.reviewName, { color: colors.text, fontFamily: fonts.families.bold }]}>{review.name}</Text>
                <Text style={{ color: colors.rating }}>{'⭐'.repeat(review.rating)}</Text>
              </View>
            </View>
            <Text style={[styles.reviewText, { color: colors.textSecondary, fontFamily: fonts.families.regular }]}>"{review.text}"</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderPromo = () => (
    <View style={[styles.promoContainer, { marginHorizontal: spacing.lg }]}>
      <Image source={{ uri: MOCK_IMAGES.promo }} style={[styles.promoImage, { borderRadius: radius.lg }]} />
      <View style={[styles.promoOverlay, { borderRadius: radius.lg }]}>
        <Text style={styles.promoTitle}>Summer Special!</Text>
        <Text style={styles.promoSubtitle}>Up to 30% off on selected packages</Text>
        <TouchableOpacity style={[styles.promoBtn, { backgroundColor: colors.white }]}>
          <Text style={[styles.promoBtnText, { color: colors.primary, fontFamily: fonts.families.bold }]}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWhatsApp = () => (
    <TouchableOpacity
      style={[styles.whatsappBtn, { backgroundColor: colors.whatsapp }]}
      onPress={() => Linking.openURL('https://wa.me/255712345678')}
    >
      <Text style={styles.whatsappIcon}>💬</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderSearch()}
        {renderCategories()}
        {renderDestinations()}
        {renderFeatured()}
        {renderPromo()}
        {renderReviews()}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>Powered by Infaan Travel</Text>
          <Text style={[styles.footerText, { color: colors.textTertiary, marginTop: 4 }]}>© 2026 Infaan Travel. All rights reserved.</Text>
        </View>
      </ScrollView>
      {renderWhatsApp()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: { height: 420, position: 'relative' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
  heroContent: { position: 'absolute', bottom: 40, left: 24, right: 24 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 24, fontWeight: '500' },
  heroButtons: { flexDirection: 'row', gap: 12 },
  heroBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  heroBtnPrimary: { backgroundColor: '#FFFFFF' },
  heroBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  heroBtnText: { fontSize: 15, fontWeight: '700', color: '#0B5E8A' },
  searchContainer: { padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, height: 40 },
  searchFilters: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterChipText: { fontSize: 13 },
  searchBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginLeft: 'auto' },
  searchBtnText: { color: '#FFFFFF', fontSize: 14 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  categoriesRow: { gap: 12, paddingRight: 20 },
  categoryCard: { width: 80, height: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { fontSize: 28 },
  categoryName: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  destinationsRow: { gap: 16, paddingRight: 20 },
  reviewsRow: { gap: 16, paddingRight: 20 },
  reviewCard: { width: 280, padding: 20 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  reviewName: { fontSize: 15 },
  reviewText: { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  promoContainer: { marginTop: 28, marginBottom: 8, height: 200, position: 'relative' },
  promoImage: { width: '100%', height: '100%' },
  promoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,94,138,0.7)', padding: 24, justifyContent: 'center' },
  promoTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  promoSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginBottom: 16 },
  promoBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start' },
  promoBtnText: { fontSize: 14 },
  whatsappBtn: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  whatsappIcon: { fontSize: 28 },
  footer: { padding: 24, alignItems: 'center', borderTopWidth: 1, marginTop: 32 },
  footerText: { fontSize: 12 },
});
