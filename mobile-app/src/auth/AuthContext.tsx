import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { createClient, Session } from '../api/client';
import { createPKCE, codeChallenge, parseCallback } from './pkce';

export function resolveDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000`;
  }
  if (Platform.OS === 'android') {
    // 10.0.2.2 is the standard loopback alias to host machine from Android emulator
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
}

export const API = resolveDefaultApiUrl();
const REFRESH_KEY = 'oauth.refresh';
const API_URL_KEY = 'api.custom_url';

type Auth = {
  ready: boolean;
  authenticated: boolean;
  apiUrl: string;
  setApiUrl: (url: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  client: ReturnType<typeof createClient>;
  elevated: React.MutableRefObject<string | null>;
};

const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const access = useRef<string | null>(null);
  const elevated = useRef<string | null>(null);
  const pending = useRef(false);

  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [apiUrl, setApiUrlState] = useState(API);

  // Load custom API URL if stored
  useEffect(() => {
    void SecureStore.getItemAsync(API_URL_KEY).then((stored) => {
      if (stored && stored.startsWith('http')) {
        setApiUrlState(stored);
      }
    });
  }, []);

  const setApiUrl = async (url: string) => {
    const cleaned = url.trim().replace(/\/+$/, '');
    setApiUrlState(cleaned);
    await SecureStore.setItemAsync(API_URL_KEY, cleaned);
  };

  const save = async (s: Session) => {
    await SecureStore.setItemAsync(REFRESH_KEY, s.refresh_token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    access.current = s.access_token;
    elevated.current = null;
    setAuthenticated(true);
  };

  const logout = async () => {
    access.current = null;
    elevated.current = null;
    setAuthenticated(false);
    try {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } finally {
      router.replace('/welcome');
    }
  };

  const client = useMemo(
    () =>
      createClient(apiUrl, {
        getAccess: () => access.current,
        getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
        save,
        logout,
      }),
    [apiUrl]
  );

  useEffect(() => {
    (async () => {
      try {
        if (await SecureStore.getItemAsync(REFRESH_KEY)) {
          await client.refresh();
        }
      } catch {
        // Refresh token expired or revoked
      } finally {
        setReady(true);
      }
    })();
  }, [client]);

  async function login() {
    if (pending.current) return;
    pending.current = true;
    try {
      const { verifier, state } = createPKCE();
      const redirect_uri = Linking.createURL('oauth/callback');
      const challenge = await codeChallenge(verifier);

      const params = new URLSearchParams({
        client_id: 'unisabana-mobile',
        redirect_uri,
        response_type: 'code',
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state,
      });

      const targetAuthUrl = `${apiUrl}/oauth/authorize?${params.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(targetAuthUrl, redirect_uri);

      if (result.type !== 'success') {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Inicio de sesión cancelado por el usuario');
        }
        throw new Error(`Navegador cerrado sin completar autorización (${result.type})`);
      }

      const code = parseCallback(result.url, state);

      const r = await fetch(apiUrl + '/auth/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          code_verifier: verifier,
          redirect_uri,
          client_id: 'unisabana-mobile',
        }),
      });

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo intercambiar el código por tokens');
      }

      await save(await r.json());
      router.replace('/home');
    } finally {
      pending.current = false;
    }
  }

  return (
    <Context.Provider
      value={{
        ready,
        authenticated,
        apiUrl,
        setApiUrl,
        login,
        logout,
        client,
        elevated,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const a = useContext(Context);
  if (!a) throw new Error('AuthProvider ausente');
  return a;
}
