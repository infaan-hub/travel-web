import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ToursScreen from '../screens/ToursScreen';
import TourDetailScreen from '../screens/TourDetailScreen';
import AttractionsScreen from '../screens/AttractionsScreen';
import BookingScreen from '../screens/BookingScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ContactScreen from '../screens/ContactScreen';
import TripsScreen from '../screens/TripsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminRegisterScreen from '../screens/AdminRegisterScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminCustomersScreen from '../screens/AdminCustomersScreen';
import AdminToursScreen from '../screens/AdminToursScreen';
import AdminTripsScreen from '../screens/AdminTripsScreen';
import AdminBookingsScreen from '../screens/AdminBookingsScreen';
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminHomeEditorScreen from '../screens/AdminHomeEditorScreen';
import AdminReviewsScreen from '../screens/AdminReviewsScreen';
import AdminAttractionsScreen from '../screens/AdminAttractionsScreen';
import AdminTipsScreen from '../screens/AdminTipsScreen';
import AdminMessagesScreen from '../screens/AdminMessagesScreen';

type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Admin: undefined;
  TourDetail: { id: number };
  Booking: { tourId?: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.aqua,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Tours" component={ToursScreen} options={{ tabBarLabel: 'Tours', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌍</Text> }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarLabel: 'Bookings', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text> }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgSolid }}>
        <ActivityIndicator size="large" color={colors.aqua} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={CustomerTabs} />
            <Stack.Screen name="TourDetail" component={TourDetailScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="Attractions" component={AttractionsScreen} />
            <Stack.Screen name="Contact" component={ContactScreen} />
            <Stack.Screen name="Trips" component={TripsScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminCustomers" component={AdminCustomersScreen} />
            <Stack.Screen name="AdminTours" component={AdminToursScreen} />
            <Stack.Screen name="AdminTrips" component={AdminTripsScreen} />
            <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} />
            <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
            <Stack.Screen name="AdminHomeEditor" component={AdminHomeEditorScreen} />
            <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} />
            <Stack.Screen name="AdminAttractions" component={AdminAttractionsScreen} />
            <Stack.Screen name="AdminTips" component={AdminTipsScreen} />
            <Stack.Screen name="AdminMessages" component={AdminMessagesScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuthStack() {
  const AuthStackNav = createNativeStackNavigator();
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen name="Main" component={CustomerTabs} />
      <AuthStackNav.Screen name="TourDetail" component={TourDetailScreen} />
      <AuthStackNav.Screen name="Booking" component={BookingScreen} />
      <AuthStackNav.Screen name="Tours" component={ToursScreen} />
      <AuthStackNav.Screen name="Attractions" component={AttractionsScreen} />
      <AuthStackNav.Screen name="Contact" component={ContactScreen} />
      <AuthStackNav.Screen name="Trips" component={TripsScreen} />
    </AuthStackNav.Navigator>
  );
}
