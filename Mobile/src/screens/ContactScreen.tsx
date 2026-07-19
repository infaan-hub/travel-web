import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { contactAPI } from '../api/client';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

export default function ContactScreen() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.subject || !form.message) {
      Alert.alert('Error', 'Please fill in all required fields'); return;
    }
    setSending(true);
    try {
      await contactAPI.send(form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch { Alert.alert('Error', 'Failed to send message.'); }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={globalStyles.pageHeader}>
          <Text style={globalStyles.pageTitle}>Contact Us</Text>
          <Text style={globalStyles.pageSubtitle}>We'd love to hear from you</Text>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>📍 Location</Text><Text style={styles.infoValue}>Zanzibar, Tanzania</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>📞 Phone</Text><Text style={styles.infoValue}>+255711252758</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>✉️ Email</Text><Text style={styles.infoValue}>infaanhameed@gmail.com</Text></View>
        </View>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.successText, textAlign: 'center' }}>Message Sent!</Text>
            <Text style={{ textAlign: 'center', marginTop: 8, color: colors.textSecondary }}>We'll get back to you within 24 hours.</Text>
            <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 16 }]} onPress={() => setSent(false)}>
              <Text style={globalStyles.btnPrimaryText}>Send Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Your Name *</Text><TextInput style={globalStyles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="John Doe" /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Your Email *</Text><TextInput style={globalStyles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" placeholder="john@email.com" /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Phone</Text><TextInput style={globalStyles.input} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" placeholder="+255711252758" /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Subject *</Text><TextInput style={globalStyles.input} value={form.subject} onChangeText={(t) => setForm({ ...form, subject: t })} placeholder="How can we help?" /></View>
            <View style={globalStyles.formGroup}><Text style={globalStyles.inputLabel}>Message *</Text><TextInput style={[globalStyles.input, { minHeight: 100 }]} value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} multiline placeholder="Tell us about your travel plans..." /></View>

            <TouchableOpacity style={[globalStyles.btnPrimary, globalStyles.btnBlock]} onPress={handleSubmit} disabled={sending}>
              <Text style={globalStyles.btnPrimaryText}>{sending ? 'Sending...' : 'Send Message'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bgSolid, flexGrow: 1 },
  contactInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  infoCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  infoLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  successCard: { backgroundColor: colors.successBg, padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
});
