import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

// ══════════════════════════════════════════════════════════════════════
// Screen Imports (werden in Sprint 2 erstellt)
// ══════════════════════════════════════════════════════════════════════
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RevenueScreen } from '../screens/RevenueScreen';
import { HarasScreen } from '../screens/HaraScreen';
import { ContentScreen } from '../screens/ContentScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ══════════════════════════════════════════════════════════════════════
// Tab-Icon
// ══════════════════════════════════════════════════════════════════════
function TabIcon({ name, focused }: { name: string; focused: boolean }): React.JSX.Element {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Revenue: '💰',
    Hara: '🤖',
    Content: '📱',
    Settings: '⚙️',
  };

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {icons[name] ?? '📄'}
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Tabs
// ══════════════════════════════════════════════════════════════════════
function MainTabs(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Revenue" component={RevenueScreen} />
      <Tab.Screen name="Hara" component={HarasScreen} />
      <Tab.Screen name="Content" component={ContentScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Root Navigator
// ══════════════════════════════════════════════════════════════════════
export function RootNavigator(): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="WebView"
            component={WebViewScreen}
            options={{ headerShown: true, headerTitle: 'WebView' }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ presentation: 'modal', headerShown: true, headerTitle: 'Zahlung' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Platzhalter-Screens (werden in Sprint 2 vollständig implementiert)
// ══════════════════════════════════════════════════════════════════════

function AuthScreen(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
      <Text style={[styles.placeholderTitle, { color: colors.text }]}>Willkommen bei CyberSarah</Text>
      <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>Bitte anmelden oder registrieren</Text>
    </View>
  );
}

function WebViewScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>WebView</Text>
    </View>
  );
}

function PaymentScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Zahlung</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 48,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0c14',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8e8ed',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: 15,
    color: '#88889a',
    textAlign: 'center',
    lineHeight: 22,
  },
});
