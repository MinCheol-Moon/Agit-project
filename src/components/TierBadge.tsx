import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Tier, TIER_LABEL } from '../types';

const TIER_STYLE: Record<Tier, { bg: string; text: string }> = {
  guest: { bg: '#e5e7eb', text: '#6b7280' },
  raljab: { bg: '#e5e7eb', text: '#4b5563' },
  talbuchak: { bg: colors.cream, text: colors.creamText },
  taljuninja: { bg: colors.cardDark, text: colors.goldLight },
  akatsuki: { bg: colors.gold, text: '#191c22' },
  admin: { bg: '#191c22', text: colors.gold },
};

export function TierBadge({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' }) {
  const style = TIER_STYLE[tier];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: style.bg },
        size === 'sm' && styles.badgeSm,
      ]}
    >
      <Text style={[styles.text, { color: style.text }, size === 'sm' && styles.textSm]}>{TIER_LABEL[tier]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '700',
    fontSize: 12,
  },
  textSm: {
    fontSize: 10,
  },
});
