import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'Store'>;

export default function StoreScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="스토어" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.icon}>🛍️</Text>
        <Text style={styles.title}>준비 중입니다</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  icon: { fontSize: 40 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
});
