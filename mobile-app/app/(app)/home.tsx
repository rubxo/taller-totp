import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import { colors } from '../../src/theme/colors';

export default function Home() {
  const auth = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas cerrar la sesión segura? El refresh_token se eliminará del Enclave de Hardware y el access_token se destruirá de la memoria RAM.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => void auth.logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.primary }]}>
          <View style={styles.headerTop}>
            <View style={styles.userBadge}>
              <Ionicons name="school-outline" size={16} color="#ffffff" />
              <Text style={styles.userBadgeText}>Universidad de La Sabana</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={handleLogout}
              style={styles.headerLogoutBtn}
            >
              <Ionicons name="log-out-outline" size={20} color="#ffffff" />
            </Pressable>
          </View>

          <Text style={styles.greetingTitle}>Portal de Seguridad Móvil</Text>
          <Text style={styles.userEmail}>estudiante@unisabana.edu.co</Text>

          {/* Session Security Pills */}
          <View style={styles.sessionPillsRow}>
            <View style={styles.sessionPill}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.sessionPillText}>RAM: access_token</Text>
            </View>
            <View style={styles.sessionPill}>
              <View style={[styles.statusDot, { backgroundColor: '#38bdf8' }]} />
              <Text style={styles.sessionPillText}>Enclave: refresh_token</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: theme.muted }]}>
          MÓDULOS DE LABORATORIO
        </Text>

        {/* Action Modules */}
        <View style={styles.modulesGrid}>
          {/* Module 1: Bóveda Crítica */}
          <Link href="/boveda" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Bóveda Crítica"
              style={({ pressed }) => [
                styles.moduleCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.moduleCardHeader}>
                <View style={[styles.moduleIconBg, { backgroundColor: '#fff1f2' }]}>
                  <Ionicons name="lock-closed" size={22} color="#e11d48" />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.badgeText, { color: '#991b1b' }]}>Step-Up 2FA</Text>
                </View>
              </View>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>Bóveda Crítica</Text>
              <Text style={[styles.moduleDesc, { color: theme.textSecondary }]}>
                Recurso sensible protegido con 403 Forbidden, elevación TOTP y bloqueo Anti-Replay.
              </Text>
              <View style={styles.moduleFooter}>
                <Text style={[styles.moduleActionText, { color: theme.accent }]}>Abrir Bóveda</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.accent} />
              </View>
            </Pressable>
          </Link>

          {/* Module 2: Autenticador TOTP */}
          <Link href="/authenticator" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Autenticador TOTP"
              style={({ pressed }) => [
                styles.moduleCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.moduleCardHeader}>
                <View style={[styles.moduleIconBg, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="timer" size={22} color="#2563eb" />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.badgeText, { color: '#1e40af' }]}>Modo Avión</Text>
                </View>
              </View>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>Autenticador TOTP</Text>
              <Text style={[styles.moduleDesc, { color: theme.textSecondary }]}>
                Generador de 6 dígitos matemático RFC 6238. Funciona 100% offline con paridad Google Authenticator.
              </Text>
              <View style={styles.moduleFooter}>
                <Text style={[styles.moduleActionText, { color: theme.accent }]}>Generar Códigos</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.accent} />
              </View>
            </Pressable>
          </Link>

          {/* Module 3: Diagnóstico & Silent Refresh */}
          <Link href="/perfil" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver Diagnóstico y Perfil"
              style={({ pressed }) => [
                styles.moduleCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.moduleCardHeader}>
                <View style={[styles.moduleIconBg, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="swap-horizontal" size={22} color="#16a34a" />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.badgeText, { color: '#166534' }]}>Silent Refresh</Text>
                </View>
              </View>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>Diagnóstico & Tokens</Text>
              <Text style={[styles.moduleDesc, { color: theme.textSecondary }]}>
                Inspección del ciclo de vida de tokens y prueba en vivo de 5 peticiones simultáneas con refresh silenciado.
              </Text>
              <View style={styles.moduleFooter}>
                <Text style={[styles.moduleActionText, { color: theme.accent }]}>Ver Diagnóstico</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.accent} />
              </View>
            </Pressable>
          </Link>

          {/* Module 4: Ajustes de Seguridad */}
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Ajustes de Seguridad"
              style={({ pressed }) => [
                styles.moduleCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.moduleCardHeader}>
                <View style={[styles.moduleIconBg, { backgroundColor: '#faf5ff' }]}>
                  <Ionicons name="shield-checkmark" size={22} color="#9333ea" />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#f3e8ff' }]}>
                  <Text style={[styles.badgeText, { color: '#6b21a8' }]}>Criptografía</Text>
                </View>
              </View>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>Ajustes & Respaldo</Text>
              <Text style={[styles.moduleDesc, { color: theme.textSecondary }]}>
                Bloqueo con PIN y biometría, privacidad de códigos y copias de seguridad cifradas con AES-GCM + Scrypt.
              </Text>
              <View style={styles.moduleFooter}>
                <Text style={[styles.moduleActionText, { color: theme.accent }]}>Configurar</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.accent} />
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            Demostración Controlada · Sesión 14 · UniSabana
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  userBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerLogoutBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
  },
  greetingTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  userEmail: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 4,
  },
  sessionPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sessionPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
    marginLeft: 4,
  },
  modulesGrid: {
    gap: 14,
  },
  moduleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  moduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 11,
  },
});
