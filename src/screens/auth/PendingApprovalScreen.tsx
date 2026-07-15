import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'PendingApproval'>;

export default function PendingApprovalScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="가입 승인 대기" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Ionicons name="hourglass-outline" size={40} color={colors.gold} />
        <Text style={styles.title}>마스터의 승인을 기다리고 있어요</Text>
        <Text style={styles.desc}>
          가입 신청이 접수되었습니다. 아카츠키(관리자)가 확인 후 승인하면{'\n'}랄잡 등급으로 활동을 시작할 수 있어요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
