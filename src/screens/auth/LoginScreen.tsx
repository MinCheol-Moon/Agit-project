import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/colors';
import { AuthStackParamList } from '../../navigation/types';
import { logIn } from '../../data/users';
import { useAuth } from '../../context/AuthContext';
import { ShuffledKeypad } from '../../components/ShuffledKeypad';
import { authenticateBiometric, biometricAvailable, getSavedLogin, saveLogin } from '../../lib/savedLogin';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { refresh } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);

  useEffect(() => {
    Promise.all([biometricAvailable(), getSavedLogin()]).then(([available, saved]) => {
      setCanBiometric(available && Boolean(saved));
    });
  }, []);

  const handleBiometricLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const saved = await getSavedLogin();
      if (!saved) {
        setCanBiometric(false);
        return;
      }
      if (!(await authenticateBiometric())) return;
      await logIn(saved.identifier, saved.code);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmIdentifier = () => {
    if (!identifier.trim()) return;
    setIdentifier(identifier.trim());
    setConfirmed(true);
  };

  const handleDigit = async (digit: string) => {
    if (code.length >= 4 || submitting) return;
    const next = code + digit;
    setCode(next);
    if (next.length === 4) {
      setSubmitting(true);
      setError('');
      try {
        await logIn(identifier, next);
        await saveLogin(identifier.trim(), next); // enables biometric quick login next time
        await refresh();
        // AuthGate (RootNavigator) swaps to MainTabNavigator once `user` is set.
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setCode('');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const step2 = confirmed;

  return (
    <View style={styles.screen}>
      {!step2 ? (
        <View style={styles.identifierBox}>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>닉네임 또는 실명을 입력하세요</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="닉네임 또는 실명"
            autoFocus
            onSubmitEditing={confirmIdentifier}
          />
          <TouchableOpacity
            style={styles.nextButton}
            disabled={!identifier.trim()}
            onPress={confirmIdentifier}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
          {canBiometric && (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
              <Ionicons name="finger-print" size={18} color={colors.goldLight} />
              <Text style={styles.biometricText}>생체인증으로 로그인</Text>
            </TouchableOpacity>
          )}
          {error && !confirmed ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.keypadBox}>
          <Text style={styles.title}>{identifier}</Text>
          <Text style={styles.subtitle}>가입할 때 등록한 전화번호 뒷 4자리</Text>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i < code.length && styles.dotFilled]} />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorSpacer} />}
          <ShuffledKeypad onPress={handleDigit} onBackspace={() => setCode((c) => c.slice(0, -1))} />
          <TouchableOpacity
            onPress={() => {
              setIdentifier('');
              setConfirmed(false);
              setCode('');
              setError('');
            }}
          >
            <Text style={styles.backLink}>다시 입력</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  identifierBox: { width: '100%', paddingHorizontal: spacing.xl, alignItems: 'center' },
  keypadBox: { alignItems: 'center' },
  title: { color: colors.white, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xl, textAlign: 'center' },
  input: {
    width: '100%',
    backgroundColor: colors.cardDarkAlt,
    color: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  nextButton: { backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 14, paddingHorizontal: spacing.xxl, marginBottom: spacing.lg },
  nextButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  biometricButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
  biometricText: { color: colors.goldLight, fontSize: 14, fontWeight: '600' },
  backLink: { color: colors.goldLight, fontSize: 13 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.gold },
  dotFilled: { backgroundColor: colors.gold },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.xl, height: 18 },
  errorSpacer: { height: 18, marginBottom: spacing.xl },
});
