import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/AuthContext';
import Button from '../components/ui/Button';

const SETTINGS_SECTIONS = [
  {
    title: 'Preferences',
    items: [
      { icon: '🌙', label: 'Dark Mode', type: 'switch' as const },
      { icon: '🌐', label: 'Language', value: 'English', type: 'select' as const },
      { icon: '💵', label: 'Currency', value: 'USD ($)', type: 'select' as const },
      { icon: '🔔', label: 'Notifications', type: 'switch' as const },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: '👤', label: 'Edit Profile', type: 'link' as const },
      { icon: '🔒', label: 'Change Password', type: 'link' as const },
      { icon: '🗑️', label: 'Delete Account', type: 'danger' as const, color: '#EF4444' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '📋', label: 'Terms & Conditions', type: 'link' as const },
      { icon: '🔏', label: 'Privacy Policy', type: 'link' as const },
      { icon: '❓', label: 'Help Center', type: 'link' as const },
      { icon: '📧', label: 'Contact Us', type: 'link' as const },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: 'ℹ️', label: 'App Version', value: '1.0.0', type: 'info' as const },
      { icon: '✈️', label: 'Powered by Infaan Travel', type: 'info' as const },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    'Dark Mode': false,
    'Notifications': true,
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { logout(); router.back(); } },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      {SETTINGS_SECTIONS.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[styles.sectionItem, { borderBottomColor: colors.border }, ii === section.items.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (item.type === 'danger') handleDelete();
                }}
                disabled={item.type === 'switch' || item.type === 'info'}
              >
                <Text style={{ fontSize: 20, marginRight: 14 }}>{item.icon}</Text>
                <Text style={[styles.itemLabel, { color: (item as any).color || colors.text, fontFamily: fonts.families.medium }]}>{item.label}</Text>
                {item.type === 'switch' && (
                  <Switch
                    value={toggles[item.label] || false}
                    onValueChange={v => setToggles({ ...toggles, [item.label]: v })}
                    trackColor={{ false: colors.border, true: colors.primary + '60' }}
                    thumbColor={toggles[item.label] ? colors.primary : colors.textTertiary}
                  />
                )}
                {(item.type === 'select' || item.type === 'info') && (
                  <Text style={[styles.itemValue, { color: colors.textTertiary }]}>{item.value}</Text>
                )}
                {item.type === 'link' && (
                  <Text style={[styles.itemArrow, { color: colors.textTertiary }]}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {isAuthenticated && (
        <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 40 }}>
          <Button title="Sign Out" onPress={() => { logout(); router.back(); }} variant="outline" style={{ borderColor: colors.error }} textStyle={{ color: colors.error }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  sectionCard: { overflow: 'hidden' },
  sectionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  itemLabel: { flex: 1, fontSize: 15 },
  itemValue: { fontSize: 13, marginRight: 8 },
  itemArrow: { fontSize: 20 },
});
