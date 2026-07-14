import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../theme/colors';
import { useAppLock } from '../../context/AppLockContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinScreen() {
  const { hasPin, unlock, createPin } = useAppLock();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');

  const currentValue = stage === 'enter' ? pin : confirmPin;

  const handlePress = async (key: string) => {
    if (key === '') return;
    setError('');
    if (key === '⌫') {
      if (stage === 'enter') setPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      return;
    }
    if (currentValue.length >= 4) return;
    const next = currentValue + key;

    if (!hasPin) {
      if (stage === 'enter') {
        setPin(next);
        if (next.length === 4) setStage('confirm');
        return;
      }
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === pin) {
          await createPin(next);
        } else {
          setError('PIN이 일치하지 않습니다');
          setPin('');
          setConfirmPin('');
          setStage('enter');
        }
      }
      return;
    }

    setPin(next);
    if (next.length === 4) {
      const ok = await unlock(next);
      if (!ok) {
        setError('PIN이 올바르지 않습니다');
        setPin('');
      }
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{hasPin ? 'PIN 입력' : stage === 'enter' ? 'PIN 설정' : 'PIN 확인'}</Text>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < currentValue.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorSpacer} />}

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={styles.key}
            disabled={key === ''}
            onPress={() => handlePress(key)}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: '600', marginBottom: spacing.xl },
  dots: { flexDirection: 'row', gap: 16, marginBottom: spacing.md },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  dotFilled: { backgroundColor: colors.gold },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.xl, height: 18 },
  errorSpacer: { height: 18, marginBottom: spacing.xl },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    justifyContent: 'space-between',
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  keyText: { color: colors.white, fontSize: 24, fontWeight: '500' },
});
