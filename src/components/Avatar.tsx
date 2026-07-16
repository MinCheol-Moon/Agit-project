import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// KakaoTalk-style circular profile photo with an initial-letter fallback.
export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const radius = size / 2;
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name?.[0] ?? '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.goldLight, fontWeight: '700' },
});
