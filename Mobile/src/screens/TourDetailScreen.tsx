import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { toursAPI, reviewsAPI } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function TourDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toursAPI.getById(id).then(res => setTour(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;
  if (!tour) return <View style={styles.center}><Text>Tour not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: getImageUrl(tour.image_url) || '' }} style={styles.hero} />
      <View style={styles.overlay}>
        <Text style={styles.title}>{tour.title}</Text>
        <Text style={styles.subtitle}>{tour.destination} | {tour.duration}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={globalStyles.sectionTitle}>About This Tour</Text>
          <Text style={styles.description}>{tour.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={globalStyles.sectionTitle}>Price</Text>
          <Text style={styles.price}>${tour.price} <Text style={{ fontSize: 14, color: colors.textLight }}>/ person</Text></Text>
        </View>

        {tour.itinerary && tour.itinerary.length > 0 && (
          <View style={styles.section}>
            <Text style={globalStyles.sectionTitle}>Itinerary</Text>
            {tour.itinerary.map((item: any, i: number) => (
              <View key={i} style={styles.itineraryItem}>
                <View style={styles.itineraryDay}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Day {item.day}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', marginBottom: 2 }}>{item.title}</Text><Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.description}</Text></View>
              </View>
            ))}
          </View>
        )}

        {tour.includes && tour.includes.length > 0 && (
          <View style={styles.section}>
            <Text style={globalStyles.sectionTitle}>Includes</Text>
            <View style={styles.tagRow}>{tour.includes.map((i: string, idx: number) => <View key={idx} style={styles.includeTag}><Text style={{ color: colors.successText, fontSize: 12 }}>✓ {i}</Text></View>)}</View>
          </View>
        )}

        {tour.reviews && tour.reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={globalStyles.sectionTitle}>Reviews</Text>
            {tour.reviews.map((r: any, i: number) => (
              <View key={i} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row' }}>{Array.from({ length: 5 }, (_, j) => <Text key={j} style={{ color: j < r.rating ? colors.starColor : colors.starEmpty }}>★</Text>)}</View>
                <Text style={{ fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>"{r.content}"</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>- {r.user_name}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock, { marginTop: 8 }]} onPress={() => navigation.navigate('Booking', { tourId: id })}>
          <Text style={globalStyles.btnPrimaryText}>Book This Tour</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 280 },
  overlay: { position: 'absolute', top: 220, left: 16, right: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { padding: 16, paddingTop: 40 },
  section: { marginBottom: 24 },
  description: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  price: { fontSize: 28, fontWeight: '700', color: colors.aqua },
  itineraryItem: { flexDirection: 'row', gap: 12, marginBottom: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  itineraryDay: { width: 60, height: 36, backgroundColor: colors.aqua, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  includeTag: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.successBg, borderRadius: 20 },
  reviewCard: { padding: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
});
