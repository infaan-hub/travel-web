import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions, ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import { toursAPI, homeSettingsAPI, reviewsAPI, attractionsAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [featuredTours, setFeaturedTours] = useState<any[]>([]);
  const [allTours, setAllTours] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [homeSettings, setHomeSettings] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      toursAPI.getAll({ featured: true }),
      toursAPI.getAll({}),
      homeSettingsAPI.get(),
      reviewsAPI.getAll({ status: 'approved' }),
      attractionsAPI.getAll({}),
    ]).then(([featuredRes, allRes, homeRes, reviewsRes, attractionsRes]) => {
      setFeaturedTours(featuredRes.data.results || featuredRes.data);
      const all = allRes.data.results || allRes.data;
      setAllTours(all);
      setHomeSettings(homeRes.data);
      setReviews(reviewsRes.data.results || reviewsRes.data);
      setAttractions(attractionsRes.data.results || attractionsRes.data);
      setStats({
        zanzibar: all.filter((t: any) => t.category === 'zanzibar').length,
        tanzania: all.filter((t: any) => t.category === 'tanzania').length,
        total: all.length,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleReviewSubmit = async () => {
    if (!reviewForm.content.trim()) { Alert.alert('Error', 'Review message is required'); return; }
    setReviewSaving(true);
    try {
      await reviewsAPI.create({ rating: reviewForm.rating, content: reviewForm.content.trim() });
      Alert.alert('Thank you!', 'Your review has been submitted and will appear after approval.');
      setReviewForm({ rating: 5, content: '' });
      setShowReviewForm(false);
    } catch { Alert.alert('Error', 'Failed to submit review.'); }
    finally { setReviewSaving(false); }
  };

  const heroImage = getImageUrl(homeSettings?.hero_image_url);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.heroSection, heroImage ? { backgroundColor: 'transparent' } : {}]}>
        {heroImage && <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} />}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Discover the Magic of Tanzania</Text>
          <Text style={styles.heroSubtitle}>From the pristine beaches of Zanzibar to the wild savannahs of Serengeti</Text>
        </View>
      </View>

      {!loading && featuredTours.length > 0 && (
        <View style={styles.section}>
          <View style={globalStyles.sectionHeader}>
            <Text style={globalStyles.sectionTitle}>Featured Tours</Text>
            <Text style={globalStyles.sectionSubtitle}>Hand-picked experiences for unforgettable memories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toursScroll}>
            {featuredTours.map((tour: any) => (
              <TouchableOpacity key={tour.id} style={styles.featuredCard} onPress={() => navigation.navigate('TourDetail', { id: tour.id })}>
                <Image source={{ uri: getImageUrl(tour.image_url) || '' }} style={styles.featuredImage} />
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredTitle}>{tour.title}</Text>
                  <Text style={styles.featuredPrice}>${tour.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <View style={globalStyles.sectionHeader}>
          <Text style={globalStyles.sectionTitle}>Choose Your Adventure</Text>
          <Text style={globalStyles.sectionSubtitle}>Two incredible destinations, one unforgettable country</Text>
        </View>
        <TouchableOpacity style={styles.destinationCard} onPress={() => navigation.navigate('Tours', { category: 'zanzibar' })}>
          <Text style={styles.destinationTitle}>Zanzibar</Text>
          <Text style={styles.destinationDesc}>Pristine beaches, spice farms, and rich Swahili culture.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.destinationCard, styles.destinationCard2]} onPress={() => navigation.navigate('Tours', { category: 'tanzania' })}>
          <Text style={styles.destinationTitle}>Tanzania Safaris</Text>
          <Text style={styles.destinationDesc}>Serengeti, Kilimanjaro, Ngorongoro - Africa's greatest wildlife experiences.</Text>
        </TouchableOpacity>
      </View>

      {!loading && allTours.length > 0 && (
        <View style={styles.section}>
          <View style={globalStyles.sectionHeader}>
            <Text style={globalStyles.sectionTitle}>Explore All Tours</Text>
            <Text style={globalStyles.sectionSubtitle}>Discover every tour we offer</Text>
          </View>
          {allTours.slice(0, 4).map((tour: any) => (
            <TouchableOpacity key={tour.id} style={styles.tourRow} onPress={() => navigation.navigate('TourDetail', { id: tour.id })}>
              <Image source={{ uri: getImageUrl(tour.image_url) || '' }} style={styles.tourRowImage} />
              <View style={styles.tourRowInfo}>
                <Text style={styles.tourRowTitle}>{tour.title}</Text>
                <Text style={styles.tourRowPrice}>${tour.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!loading && attractions.length > 0 && (
        <View style={styles.section}>
          <View style={globalStyles.sectionHeader}>
            <Text style={globalStyles.sectionTitle}>Top Attractions</Text>
            <Text style={globalStyles.sectionSubtitle}>Discover the most amazing places to visit</Text>
          </View>
          {attractions.slice(0, 4).map((att: any) => (
            <TouchableOpacity key={att.id} style={styles.attractionRow}>
              <Image source={{ uri: getImageUrl(att.image_url) || '' }} style={styles.attractionRowImage} />
              <View style={styles.attractionRowInfo}>
                <Text style={styles.attractionRowName}>{att.name}</Text>
                <Text style={styles.attractionRowLocation}>{att.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {reviews.length > 0 && (
        <View style={styles.section}>
          <View style={globalStyles.sectionHeader}>
            <Text style={globalStyles.sectionTitle}>What Our Travelers Say</Text>
            <Text style={globalStyles.sectionSubtitle}>Read reviews from our happy travelers</Text>
          </View>
          {reviews.slice(0, 3).map((review: any) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewStars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Text key={i} style={{ fontSize: 16, color: i < review.rating ? colors.starColor : colors.starEmpty }}>★</Text>
                ))}
              </View>
              <Text style={styles.reviewText}>"{review.content}"</Text>
              <Text style={styles.reviewAuthor}>- {review.user_name}</Text>
            </View>
          ))}
          <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock, { marginTop: 16 }]} onPress={() => setShowReviewForm(true)}>
            <Text style={globalStyles.btnPrimaryText}>Write a Review</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsSection}>
        <View style={styles.statItem}><Text style={styles.statNumber}>{stats.total || '50+'}</Text><Text style={styles.statLabel}>Amazing Tours</Text></View>
        <View style={styles.statItem}><Text style={styles.statNumber}>{stats.zanzibar || '15+'}</Text><Text style={styles.statLabel}>Zanzibar Tours</Text></View>
        <View style={styles.statItem}><Text style={styles.statNumber}>{stats.tanzania || '20+'}</Text><Text style={styles.statLabel}>Tanzania Safaris</Text></View>
        <View style={styles.statItem}><Text style={styles.statNumber}>1000+</Text><Text style={styles.statLabel}>Happy Travelers</Text></View>
      </View>

      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready for Your African Adventure?</Text>
        <Text style={styles.ctaText}>Book your dream tour today and create memories that last a lifetime</Text>
        <TouchableOpacity style={[globalStyles.btnPrimary, { paddingHorizontal: 40 }]} onPress={() => navigation.navigate('Tours')}>
          <Text style={globalStyles.btnPrimaryText}>Start Planning Your Trip</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showReviewForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Your Experience</Text>
            <View style={styles.starInput}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setReviewForm({ ...reviewForm, rating: s })}>
                  <Text style={{ fontSize: 32, color: s <= reviewForm.rating ? colors.starColor : colors.starEmpty }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[globalStyles.input, { minHeight: 100, marginVertical: 16 }]}
              placeholder="Share your experience..."
              multiline
              value={reviewForm.content}
              onChangeText={(text) => setReviewForm({ ...reviewForm, content: text })}
            />
            <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleReviewSubmit} disabled={reviewSaving}>
              <Text style={globalStyles.btnPrimaryText}>{reviewSaving ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[globalStyles.btnSecondary, globalStyles.btnBlock, { marginTop: 8 }]} onPress={() => setShowReviewForm(false)}>
              <Text style={globalStyles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  heroSection: { height: 280, position: 'relative', overflow: 'hidden', marginBottom: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  heroContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: 300 },
  section: { padding: 16, marginBottom: 8 },
  toursScroll: { paddingLeft: 4 },
  featuredCard: { width: 200, marginRight: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  featuredImage: { width: 200, height: 130 },
  featuredInfo: { padding: 12 },
  featuredTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  featuredPrice: { fontSize: 16, fontWeight: '700', color: colors.aqua, marginTop: 4 },
  destinationCard: { backgroundColor: 'rgba(0,212,216,0.1)', borderRadius: 18, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,212,216,0.2)' },
  destinationCard2: { backgroundColor: 'rgba(77,238,234,0.08)', borderColor: 'rgba(77,238,234,0.2)' },
  destinationTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  destinationDesc: { fontSize: 13, color: colors.textSecondary },
  tourRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  tourRowImage: { width: 80, height: 80 },
  tourRowInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  tourRowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  tourRowPrice: { fontSize: 16, fontWeight: '700', color: colors.aqua, marginTop: 4 },
  attractionRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, marginBottom: 8, overflow: 'hidden' },
  attractionRowImage: { width: 80, height: 80 },
  attractionRowInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  attractionRowName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  attractionRowLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reviewCard: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  reviewStars: { flexDirection: 'row', marginBottom: 8 },
  reviewText: { fontSize: 14, fontStyle: 'italic', color: colors.textPrimary, lineHeight: 20, marginBottom: 8 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: colors.aqua },
  statsSection: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statItem: { width: '46%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', marginBottom: 8 },
  statNumber: { fontSize: 28, fontWeight: '700', color: colors.aqua, marginBottom: 4 },
  statLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  ctaSection: { margin: 16, padding: 32, backgroundColor: 'rgba(0,212,216,0.05)', borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ctaTitle: { fontSize: 22, fontWeight: '700', color: colors.aqua, textAlign: 'center', marginBottom: 8 },
  ctaText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  starInput: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
});
