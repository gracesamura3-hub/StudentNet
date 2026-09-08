import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import InboxScreen from './src/screens/InboxScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import OpportunitiesScreen from './src/screens/OpportunitiesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors } from './src/theme';

enableScreens();
const Tabs = createBottomTabNavigator();

const icons = {
  Home: ['home', 'home-outline'],
  Network: ['people', 'people-outline'],
  Opportunities: ['briefcase', 'briefcase-outline'],
  Inbox: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused, color }) => <Ionicons name={(icons[route.name] || ['stats-chart', 'stats-chart-outline'])[focused ? 0 : 1]} size={21} color={color} />,
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Network" component={NetworkScreen} />
      <Tabs.Screen name="Opportunities" component={OpportunitiesScreen} options={{ tabBarLabel: 'Careers' }} />
      <Tabs.Screen name="Inbox" component={InboxScreen} options={{ tabBarBadge: 3, tabBarBadgeStyle: styles.tabBadge }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
      <Tabs.Screen name="Insights" component={InsightsScreen} options={{ tabBarButton: () => null }} />
    </Tabs.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [onboardedUsers, setOnboardedUsers] = useState(new Set());
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.green} size="large" /></View>;
  if (!user) return <AuthScreen />;
  if (!onboardedUsers.has(user.id)) return <OnboardingScreen user={user} onComplete={() => setOnboardedUsers(current => new Set([...current, user.id]))} />;
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.cream } }}>
      <View style={styles.appShell}><MainTabs /></View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider><AppContent /></AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 520 : undefined, alignSelf: 'center', backgroundColor: colors.cream, overflow: 'hidden' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  tabBar: { position: 'absolute', height: Platform.OS === 'ios' ? 86 : 70, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 22 : 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: 'rgba(255,255,255,0.97)', elevation: 12, shadowColor: colors.ink, shadowOffset: { width: 0, height: -7 }, shadowOpacity: 0.06, shadowRadius: 15 },
  tabItem: { paddingVertical: 3 }, tabLabel: { fontSize: 8, fontWeight: '800', marginTop: 3 }, tabBadge: { backgroundColor: colors.coral, color: colors.white, fontSize: 8, fontWeight: '900', minWidth: 16, height: 16, lineHeight: 16 },
});
