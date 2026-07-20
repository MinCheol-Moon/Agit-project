import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

function shuffledDigits(): string[] {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

// Phone-dial-shaped 3x4 grid; digits are placed in shuffled order but the
// last row keeps only its center cell filled, same as a real dial pad. When
// onBackspace is given, the bottom-right cell becomes a delete key so a
// mistap can be corrected instead of having to finish all four digits.
export function ShuffledKeypad({ onPress, onBackspace }: { onPress: (digit: string) => void; onBackspace?: () => void }) {
  const digits = useMemo(shuffledDigits, []);
  const layout = [...digits.slice(0, 9), '', digits[9], 'backspace'];

  return (
    <View style={styles.grid}>
      {layout.map((cell, i) => {
        if (cell === 'backspace') {
          return (
            <TouchableOpacity
              key={i}
              style={styles.key}
              disabled={!onBackspace}
              onPress={() => onBackspace?.()}
              activeOpacity={0.6}
            >
              {onBackspace ? <Ionicons name="backspace-outline" size={26} color={colors.white} /> : null}
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={i}
            style={styles.key}
            disabled={cell === ''}
            onPress={() => onPress(cell)}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>{cell}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
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
    marginBottom: 16,
  },
  keyText: { color: colors.white, fontSize: 24, fontWeight: '500' },
});
