import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider } from '../src/auth/AuthContext';
import { isLockEnabled } from '../src/lib/lock';
import { colors } from '../src/theme/colors';
import LockScreen from './lock';

// Required for expo-web-browser to properly complete auth redirects on Android/Web
WebBrowser.maybeCompleteAuthSession();

const BACKGROUND_LOCK_MS = 30_000;

export default function Layout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    isLockEnabled().then((enabled) => {
      setLocked(enabled);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        backgroundAt.current = Date.now();
      }
      if (
        next === 'active' &&
        backgroundAt.current &&
        Date.now() - backgroundAt.current >= BACKGROUND_LOCK_MS
      ) {
        void isLockEnabled().then((enabled) => {
          if (enabled) setLocked(true);
        });
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return (
    <AuthProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.card,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.bg,
          },
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="lock" options={{ headerShown: false }} />
        <Stack.Screen
          name="authenticator"
          options={{
            title: 'Autenticador TOTP',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="add/manual"
          options={{
            title: 'Nueva Cuenta',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="add/scan"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            headerBackTitle: 'Atrás',
          }}
        />
        <Stack.Screen
          name="account/[id]"
          options={{
            title: 'Detalle de Cuenta',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack>

      {/* Security Lock Overlay Modal */}
      <Modal
        visible={locked}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <LockScreen onUnlock={() => setLocked(false)} />
      </Modal>
    </AuthProvider>
  );
}
