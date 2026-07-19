import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style, textStyle,
}: ButtonProps) {
  const { colors, radius, spacing, fonts } = useTheme();

  const bgColor = variant === 'primary' ? colors.primary
    : variant === 'secondary' ? colors.secondary
    : variant === 'outline' ? 'transparent'
    : 'transparent';

  const txtColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white;
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  const height = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  const fontSize = size === 'sm' ? fonts.sizes.sm : size === 'lg' ? fonts.sizes.lg : fonts.sizes.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          height,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: size === 'sm' ? spacing.lg : spacing.xxl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: txtColor, fontSize, fontFamily: fonts.families.medium }, icon ? { marginLeft: spacing.sm } : {}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
