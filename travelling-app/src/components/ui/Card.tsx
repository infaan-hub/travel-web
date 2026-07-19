import { TouchableOpacity, View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatPrice, truncate } from '../../utils';

interface CardProps {
  image: string;
  title: string;
  subtitle?: string;
  price?: number;
  duration?: string;
  rating?: number;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

export default function Card({
  image, title, subtitle, price, duration, rating,
  onPress, onFavorite, isFavorite, style, compact,
}: CardProps) {
  const { colors, radius, spacing, shadows, fonts } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          ...shadows.md,
          width: compact ? 240 : '100%',
        },
        style,
      ]}
    >
      <View style={[styles.imageContainer, { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
        <Image source={{ uri: image }} style={styles.image} />
        {onFavorite && (
          <TouchableOpacity onPress={onFavorite} style={styles.favoriteBtn}>
            <Text style={{ fontSize: 20 }}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
        {price && (
          <View style={[styles.priceBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.priceText, { color: colors.white, fontFamily: fonts.families.bold }]}>
              {formatPrice(price)}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.content, { padding: spacing.md }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.families.bold }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.families.regular }]} numberOfLines={2}>
            {truncate(subtitle, compact ? 40 : 60)}
          </Text>
        )}
        <View style={styles.meta}>
          {duration && (
            <Text style={[styles.metaText, { color: colors.textTertiary, fontFamily: fonts.families.regular }]}>
              🕐 {duration}
            </Text>
          )}
          {rating && (
            <Text style={[styles.metaText, { color: colors.rating, fontFamily: fonts.families.regular }]}>
              ⭐ {rating.toFixed(1)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', marginBottom: 16 },
  imageContainer: { position: 'relative', height: 180, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  favoriteBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  priceBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  priceText: { fontSize: 14 },
  content: {},
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaText: { fontSize: 12 },
});
