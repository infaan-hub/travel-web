import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/AuthContext';
import Button from '../../components/ui/Button';

const MENU_ITEMS = [
  { icon: '👤', label: 'Edit Profile', route: '' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '🌙', label: 'Dark Mode' },
  { icon: '🌐', label: 'Language' },
  { icon: '💵', label: 'Currency' },
  { icon: '🔒', label: 'Privacy' },
  { icon: '📋', label: 'Terms & Conditions' },
  { icon: '❓', label: 'Help & Support' },
  { icon: 'ℹ️', label: 'About', value: 'v1.0.0' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius, fonts, shadows } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>👤</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Not Signed In</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sign in to manage your profile, view bookings, and more.</Text>
        <View style={{ gap: 12, width: '100%', marginTop: 24 }}>
          <Button title="Sign In" onPress={() => router.push('/login')} size="lg" />
          <Button title="Create Account" onPress={() => router.push('/register')} variant="outline" size="lg" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: 60 }]}>
        <View style={styles.profileRow}>
          <Image source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={[styles.avatar, { borderColor: colors.white }]} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profilePhone}>{user?.phone}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          {[
            { number: '3', label: 'Upcoming' },
            { number: '12', label: 'Completed' },
            { number: '8', label: 'Favorites' },
          ].map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statNumber}>{stat.number}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.menuSection, { marginHorizontal: spacing.lg, marginTop: 24 }]}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, { borderBottomColor: colors.border }, i === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => item.label === 'About' ? null : item.label === 'Edit Profile' ? router.push('/settings') : null}
          >
            <Text style={{ fontSize: 20, marginRight: 14 }}>{item.icon}</Text>
            <Text style={[styles.menuLabel, { color: colors.text, fontFamily: fonts.families.medium }]}>{item.label}</Text>
            <Text style={[styles.menuValue, { color: colors.textTertiary }]}>{item.value || ''}</Text>
            <Text style={[styles.menuArrow, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: spacing.lg, marginTop: 16 }}>
        <Button
          title="Sign Out"
          onPress={() => { logout(); }}
          variant="outline"
          style={{ borderColor: colors.error }}
          textStyle={{ color: colors.error }}
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 24, paddingHorizontal: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profilePhone: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 16 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  menuSection: { backgroundColor: 'transparent' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  menuLabel: { flex: 1, fontSize: 15 },
  menuValue: { fontSize: 13, marginRight: 8 },
  menuArrow: { fontSize: 20 },
  emptyTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
});
