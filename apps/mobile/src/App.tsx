import React, { useEffect, useCallback } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { StripeProvider } from '@stripe/stripe-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './services/navigation';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { RootNavigator } from './navigation/RootNavigator';
import { SplashScreen } from './screens/SplashScreen';
import { SyncService } from './services/sync';

// ─── React Query Client ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// ─── Online-Status über NetInfo synchronisieren ─────────────────────
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  });
});

// ─── AppState-Listener für Fokus-Management ────────────────────────
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

import { Platform } from 'react-native';

// ─── Stripe-Publishable-Key ─────────────────────────────────────────
const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? 'pk_test_51Tf8pBAuUge07PL9Iuip0CZqZDRDmS5VvwJngiHf4q8CWWgtNq9xRhTJIPISTnydJVhT4bwmGEDvMkEGsMb8CLuc00u8pM6Sg7'
  : 'pk_live_51Tf8pBAuUge07PL9Iuip0CZqZDRDmS5VvwJngiHf4q8CWWgtNq9xRhTJIPISTnydJVhT4bwmGEDvMkEGsMb8CLuc00u8pM6Sg7';

// ─── App-Kern ───────────────────────────────────────────────────────
function AppContent(): React.JSX.Element {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isDark = theme === 'dark';
  const [showSplash, setShowSplash] = React.useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Synchronisiere Daten beim App-Start und bei Fokus-Änderungen
  useEffect(() => {
    if (isAuthenticated && !showSplash) {
      SyncService.syncAll().catch((err: Error) => {
        console.warn('[Sync] Initial-Sync fehlgeschlagen:', err.message);
      });
    }
  }, [isAuthenticated, showSplash]);

  // AppState-Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // SplashScreen anzeigen, während Auth geprüft wird
  if (showSplash || authLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return <RootNavigator />;
}

// ─── Root-Provider ──────────────────────────────────────────────────
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialTheme={isDarkMode ? 'dark' : 'dark'}>
            <AuthProvider>
              <StripeProvider
                publishableKey={STRIPE_PUBLISHABLE_KEY}
                merchantIdentifier="merchant.com.cybersarah.app"
                urlScheme="cybersarah"
              >
                <NavigationContainer
                  ref={navigationRef}
                  onReady={() => {
                    if (__DEV__) {
                      console.log('[Nav] Navigation bereit');
                    }
                  }}
                >
                  <StatusBar
                    barStyle="light-content"
                    backgroundColor="#0c0c14"
                    translucent={false}
                  />
                  <AppContent />
                </NavigationContainer>
              </StripeProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c0c14',
  },
});

export default App;
