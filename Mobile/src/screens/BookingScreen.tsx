import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { toursAPI, bookingsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function BookingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const tourId = route?.params?.tourId;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.username || '', email: user?.email || '', phone: '', address: '',
    travelers: '1', travel_date: '', notes: '', children: '0', destination: '',
  });

  useEffect(() => {
    if (tourId) {
      toursAPI.getById(tourId).then(res => {
        setTour(res.data);
        setForm(f => ({ ...f, destination: res.data.destination }));
      }).finally(() => setLoading(false));
    } else setLoading(false);
  }, [tourId]);

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.travel_date) {
      Alert.alert('Error', 'Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      await bookingsAPI.create({ ...form, travelers: parseInt(form.travelers), children: parseInt(form.children), tour: tourId });
      setSuccess(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Booking failed');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.aqua} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.pageTitle}>Book a Tour</Text>
      {tour && <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 }}>{tour.title} - ${tour.price}</Text>}

      {success ? (
        <View style={styles.successCard}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.successText, textAlign: 'center' }}>Booking Submitted!</Text>
          <Text style={{ textAlign: 'center', marginTop: 8, color: colors.textSecondary }}>We'll contact you shortly to confirm your booking.</Text>
        </View>
      ) : (
        <>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Full Name *</Text><TextInput style={globalStyles.input} value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Email *</Text><TextInput style={globalStyles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Phone *</Text><TextInput style={globalStyles.input} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Address</Text><TextInput style={globalStyles.input} value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} multiline /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Destination</Text><TextInput style={globalStyles.input} value={form.destination} onChangeText={(t) => setForm({ ...form, destination: t })} /></View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Travel Date *</Text><TextInput style={globalStyles.input} value={form.travel_date} onChangeText={(t) => setForm({ ...form, travel_date: t })} placeholder="YYYY-MM-DD" /></View>
          <View style={styles.row}>
            <View style={[globalStyles.formGroup, { flex: 1, marginRight: 8 }]}><Text style={globalStyles.inputLabel}>Adults</Text><TextInput style={globalStyles.input} value={form.travelers} onChangeText={(t) => setForm({ ...form, travelers: t })} keyboardType="numeric" /></View>
            <View style={[globalStyles.formGroup, { flex: 1, marginLeft: 8 }]}><Text style={globalStyles.inputLabel}>Children</Text><TextInput style={globalStyles.input} value={form.children} onChangeText={(t) => setForm({ ...form, children: t })} keyboardType="numeric" /></View>
          </View>
          <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Notes</Text><TextInput style={globalStyles.input} value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} multiline placeholder="Special requests..." /></View>

          <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock, { marginTop: 8 }]} onPress={handleSubmit} disabled={saving}>
            <Text style={globalStyles.btnPrimaryText}>{saving ? 'Booking...' : 'Submit Booking'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSolid },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row' },
  successCard: { backgroundColor: colors.successBg, padding: 32, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
});
