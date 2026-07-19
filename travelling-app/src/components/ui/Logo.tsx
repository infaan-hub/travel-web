import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export default function Logo({ size = 60, showText = true }: LogoProps) {
  const { colors } = useTheme();
  const iconSize = size * 0.7;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { width: size, height: size, borderRadius: size / 4, backgroundColor: colors.primary }]}>
        <Text style={[styles.iconText, { fontSize: iconSize }]}>✈️</Text>
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Infaan Travel</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Powered by Infaan Travel</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  iconContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconText: {},
  textContainer: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 4 },
});
