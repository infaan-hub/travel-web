import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const TABS = [
  { name: 'home', title: 'Home', icon: '🏠' },
  { name: 'explore', title: 'Explore', icon: '🔍' },
  { name: 'bookings', title: 'Bookings', icon: '📅' },
  { name: 'favorites', title: 'Favorites', icon: '❤️' },
  { name: 'profile', title: 'Profile', icon: '👤' },
];

function TabIcon({ icon, focused, color }: { icon: string; focused: boolean; color: any }) {
  return (
    <View style={[tabStyles.iconContainer, focused && tabStyles.activeIcon]}>
      <Text style={[tabStyles.icon, { color }]}>{icon}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  activeIcon: { marginTop: -2 },
  icon: { fontSize: 22 },
});

export default function TabLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        } as any,
        tabBarLabelStyle: {
          fontFamily: fonts.families.medium,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => <TabIcon icon={tab.icon} focused={focused} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
