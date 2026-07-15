import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
// last row keeps only its center cell filled, same as a real dial pad.
export function ShuffledKeypad({ onPress }: { onPress: (digit: string) => void }) {
  const digits = useMemo(shuffledDigits, []);
  const layout = [...digits.slice(0, 9), '', digits[9], ''];

  return (
    <View style={styles.grid}>
      {layout.map((digit, i) => (
        <TouchableOpacity
          key={i}
          style={styles.key}
          disabled={digit === ''}
          onPress={() => onPress(digit)}
          activeOpacity={0.6}
        >
          <Text style={styles.keyText}>{digit}</Text>
        </TouchableOpacity>
      ))}
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
