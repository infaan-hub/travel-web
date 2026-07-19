import { useColorScheme } from 'react-native';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../constants/theme';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return {
    isDark,
    colors,
    fonts: Fonts,
    spacing: Spacing,
    radius: Radius,
    shadows: Shadows,
  };
}
