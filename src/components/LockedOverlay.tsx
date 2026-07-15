import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { TIER_LABEL, Tier } from '../types';

export function LockedOverlay({ requiredTier }: { requiredTier: Tier }) {
  return (
    <View style={styles.overlay}>
      <Ionicons name="lock-closed" size={22} color={colors.goldLight} />
      <Text style={styles.text}>{TIER_LABEL[requiredTier]}부터 열람 가능</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23,27,36,0.72)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});
