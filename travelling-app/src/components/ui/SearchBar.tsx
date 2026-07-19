import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilter?: () => void;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search destinations...', onFilter }: SearchBarProps) {
  const { colors, radius, spacing, fonts } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: colors.border }]}>
      <Text style={[styles.icon, { color: colors.textTertiary }]}>🔍</Text>
      <TextInput
        style={[styles.input, { color: colors.text, fontFamily: fonts.families.regular }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
      />
      {onFilter && (
        <TouchableOpacity onPress={onFilter} style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 16,
  },
  icon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  filterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  filterIcon: { fontSize: 16 },
});
