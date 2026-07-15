import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.logo}>아지트</Text>
        <Text style={styles.tagline}>취미로 모이는 프라이빗 크루</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.secondaryButtonText}>가입 신청</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xxl * 2 },
  logo: { color: colors.gold, fontSize: 34, fontWeight: '800', marginBottom: spacing.sm },
  tagline: { color: colors.textMuted, fontSize: 13 },
  actions: { width: '100%', gap: spacing.md },
  primaryButton: { backgroundColor: colors.gold, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16 },
  primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondaryButton: { backgroundColor: colors.cardDarkAlt, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16 },
  secondaryButtonText: { color: colors.goldLight, fontWeight: '700', fontSize: 15 },
});
