import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Account } from '../types';
import { CountdownRing } from './CountdownRing';
import { generateTotp } from '../lib/totp';
import { colors } from '../theme/colors';

interface AccountRowProps {
  account: Account;
  now: number;
  onPress: () => void;
  onDetailsPress?: () => void;
  hidden?: boolean;
}

export function AccountRow({
  account,
  now,
  onPress,
  onDetailsPress,
  hidden = false,
}: AccountRowProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const step = Math.floor(now / 1000 / account.period);

  useEffect(() => {
    let active = true;
    generateTotp(account, step * account.period * 1000)
      .then((t) => {
        if (active) {
          setValue(t.code);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('No se pudo calcular el TOTP');
      });
    return () => {
      active = false;
    };
  }, [account, step]);

  const remainingMs = account.period * 1000 - (now % (account.period * 1000));
  const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
  const progress = remainingMs / (account.period * 1000);

  // Group digits: 6 digits -> 3 3; 8 digits -> 4 4
  const formattedCode =
    account.digits === 8
      ? value.replace(/(\d{4})(?=\d)/g, '$1 ')
      : value.replace(/(\d{3})(?=\d)/g, '$1 ');

  const handleCopy = async () => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onPress();
  };

  const isUniSabana = account.issuer.toLowerCase().includes('unisabana');
  const isUrgent = remainingSec <= 5;
  const isWarning = remainingSec <= 10;

  const progressColor = isUrgent
    ? theme.danger
    : isWarning
    ? theme.warning
    : theme.accent;

  const avatarBg = isUniSabana
    ? theme.primary
    : theme.accent;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      {/* Top Header: Avatar + Issuer & Label + Options Menu */}
      <View style={styles.header}>
        <View style={styles.issuerInfo}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Ionicons
              name={isUniSabana ? 'shield-checkmark' : 'key-outline'}
              size={18}
              color="#ffffff"
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.issuerBadgeRow}>
              <Text style={[styles.issuer, { color: theme.text }]} numberOfLines={1}>
                {account.issuer || 'Sin emisor'}
              </Text>
              {isUniSabana && (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={styles.verifiedText}>Institucional</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
              {account.label}
            </Text>
          </View>
        </View>

        {onDetailsPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar cuenta ${account.label}`}
            onPress={onDetailsPress}
            hitSlop={12}
            style={({ pressed }) => [styles.optionsBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.muted} />
          </Pressable>
        )}
      </View>

      {/* Main Interactive Code Area */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Código TOTP: ${value}. Toca para copiar`}
        onPress={handleCopy}
        style={({ pressed }) => [
          styles.codeTouchArea,
          {
            backgroundColor: pressed ? (scheme === 'dark' ? '#1e293b' : '#f8fafc') : 'transparent',
          },
        ]}
      >
        <View style={styles.codeRow}>
          <View style={styles.codeContainer}>
            {error ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            ) : (
              <Text
                style={[
                  styles.code,
                  {
                    color: isUrgent ? theme.danger : theme.text,
                  },
                ]}
              >
                {hidden ? '••• •••' : formattedCode || '••••••'}
              </Text>
            )}

            <View style={styles.copyPill}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={13}
                color={copied ? theme.success : theme.muted}
              />
              <Text
                style={[
                  styles.copyHint,
                  { color: copied ? theme.success : theme.muted, fontWeight: copied ? '700' : '500' },
                ]}
              >
                {copied ? '¡Copiado!' : isUrgent ? 'Cambia pronto' : 'Toca para copiar'}
              </Text>
            </View>
          </View>

          {/* Countdown Ring & Seconds */}
          <View style={styles.timerContainer}>
            <CountdownRing progress={progress} size={46} strokeWidth={4} />
            <Text
              style={[
                styles.secondsText,
                {
                  color: isUrgent ? theme.danger : theme.textSecondary,
                  fontWeight: isUrgent ? '800' : '600',
                },
              ]}
            >
              {remainingSec}s
            </Text>
          </View>
        </View>

        {/* Linear Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#f1f5f9' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  issuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  issuerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issuer: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsBtn: {
    padding: 6,
  },
  codeTouchArea: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeContainer: {
    flex: 1,
  },
  code: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  copyHint: {
    fontSize: 11,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 48,
    height: 48,
  },
  secondsText: {
    position: 'absolute',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
