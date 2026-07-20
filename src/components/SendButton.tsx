import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

// Native send button. Web uses SendButton.web.tsx, which keeps input focus.
export function SendButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>전송</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  text: { color: colors.white, fontWeight: '700' },
});
