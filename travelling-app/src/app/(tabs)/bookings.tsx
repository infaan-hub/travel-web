import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/ui/Button';
import { formatPrice } from '../../utils';

export default function BookingsScreen() {
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '',
    destination: '', package: '', date: '',
    adults: '1', children: '0', specialRequests: '', paymentMethod: 'credit',
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!form.destination.trim()) errs.destination = 'Destination is required';
    if (!form.date.trim()) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>✅</Text>
        <Text style={[styles.successTitle, { color: colors.text }]}>Booking Submitted!</Text>
        <Text style={[styles.successText, { color: colors.textSecondary }]}>
          Thank you, {form.fullName}! We'll contact you at {form.email} to confirm your trip to {form.destination}.
        </Text>
        <Button title="Book Another Trip" onPress={() => { setSubmitted(false); setForm({ fullName: '', phone: '', email: '', destination: '', package: '', date: '', adults: '1', children: '0', specialRequests: '', paymentMethod: 'credit' }); }} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const Field = ({ label, value, onChange, placeholder, keyboardType, multiline, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any; multiline?: boolean; error?: string }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: fonts.families.medium }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border, borderRadius: radius.md, color: colors.text, fontFamily: fonts.families.regular }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {error && <Text style={[styles.fieldError, { color: colors.error }]}>{error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.header, { marginTop: 60 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Book Your Trip</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Fill in the details below and we'll take care of the rest</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface, borderRadius: radius.xl, ...shadows.md, marginHorizontal: spacing.lg }]}>
          <Field label="Full Name" value={form.fullName} onChange={v => setForm({ ...form, fullName: v })} placeholder="John Doe" error={errors.fullName} />
          <Field label="Phone Number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="+255 712 345 678" keyboardType="phone-pad" error={errors.phone} />
          <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="john@example.com" keyboardType="email-address" error={errors.email} />
          <Field label="Destination" value={form.destination} onChange={v => setForm({ ...form, destination: v })} placeholder="e.g. Zanzibar, Serengeti" error={errors.destination} />
          <Field label="Package" value={form.package} onChange={v => setForm({ ...form, package: v })} placeholder="e.g. 5-Day Beach Escape" />
          <Field label="Travel Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="MM/DD/YYYY" error={errors.date} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: fonts.families.medium }]}>Adults</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, color: colors.text }]}
                value={form.adults}
                onChangeText={v => setForm({ ...form, adults: v })}
                keyboardType="number-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: fonts.families.medium }]}>Children</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, color: colors.text }]}
                value={form.children}
                onChangeText={v => setForm({ ...form, children: v })}
                keyboardType="number-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <Field label="Special Requests" value={form.specialRequests} onChange={v => setForm({ ...form, specialRequests: v })} placeholder="Any special requirements?" multiline />

          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: fonts.families.medium }]}>Payment Method</Text>
            <View style={styles.paymentOptions}>
              {[
                { key: 'credit', label: '💳 Credit Card' },
                { key: 'mobile', label: '📱 Mobile Money' },
                { key: 'bank', label: '🏦 Bank Transfer' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setForm({ ...form, paymentMethod: opt.key })}
                  style={[styles.paymentOption, { borderColor: form.paymentMethod === opt.key ? colors.primary : colors.border, backgroundColor: form.paymentMethod === opt.key ? colors.primary + '15' : colors.surface, borderRadius: radius.md }]}
                >
                  <Text style={[styles.paymentOptionText, { color: form.paymentMethod === opt.key ? colors.primary : colors.text, fontFamily: fonts.families.medium }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button title="Book Now" onPress={handleSubmit} size="lg" />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  form: { padding: 24 },
  fieldLabel: { fontSize: 14, marginBottom: 8 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
  fieldError: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 16 },
  paymentOptions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  paymentOption: { paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 10 },
  paymentOptionText: { fontSize: 14, fontWeight: '600' },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  successText: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
