import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { AuthStackParamList } from '../../navigation/types';
import { signUp } from '../../data/users';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [referrer, setReferrer] = useState('');
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!realName || !nickname || !phone) return;
    try {
      await signUp({ realName, nickname, phone, referrer, intro });
      // signUp() signs the new (pending) account back out - approval is
      // required before anyone can actually get into the app, so there's
      // nowhere to navigate to yet. Just confirm the application was sent.
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (submitted) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="가입 신청" />
        <View style={styles.submittedContent}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.gold} />
          <Text style={styles.submittedTitle}>가입 신청이 접수되었습니다</Text>
          <Text style={styles.submittedDesc}>
            마스터가 승인하면 로그인할 수 있어요.{'\n'}승인 전에는 로그인이 되지 않아요.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.submitText}>로그인 화면으로</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="가입 신청" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.notice}>실명·연락처는 마스터(아카츠키)만 열람하며, 앱 내에서는 닉네임만 노출됩니다.</Text>

        <Text style={styles.label}>실명</Text>
        <TextInput style={styles.input} value={realName} onChangeText={setRealName} placeholder="실명을 입력하세요" />

        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="앱에서 사용할 닉네임" />

        <Text style={styles.label}>연락처</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="010-0000-0000" keyboardType="phone-pad" />
        <Text style={styles.hint}>다른 기기에서 로그인할 때 이 번호의 뒷 4자리를 사용해요</Text>

        <Text style={styles.label}>추천인 (선택)</Text>
        <TextInput style={styles.input} value={referrer} onChangeText={setReferrer} placeholder="추천인 닉네임" />

        <Text style={styles.label}>자기소개 (선택)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={intro} onChangeText={setIntro} placeholder="간단한 소개" multiline />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>가입 신청하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  notice: { fontSize: 12, color: colors.creamText, backgroundColor: colors.cream, borderColor: colors.creamBorder, borderWidth: 1, borderRadius: radius.tile, padding: spacing.md, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14 },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: colors.gold, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16, marginTop: spacing.xxl },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.md },
  submittedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  submittedTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  submittedDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
});
