import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import {
  addExpense,
  confirmIncome,
  getBalance,
  getDuesSettings,
  hasPaidThisMonth,
  listLedger,
  updateDuesSettings,
  uploadOwnReceipt,
  uploadReceiptAndRecognize,
} from '../../data/dues';
import { listMembers } from '../../data/users';
import { DuesLedgerEntry, DuesSettings, AppUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { ScreenHeader } from '../../components/ScreenHeader';
import { GateGuard } from '../../components/GateGuard';
import { alert } from '../../lib/alert';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dues'>;

export default function DuesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  const [ledger, setLedger] = useState<DuesLedgerEntry[]>([]);
  const [settings, setSettings] = useState<DuesSettings | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [ocrPreview, setOcrPreview] = useState<{ memberName: string; amount: number; occurredAt: string; recognized: boolean } | null>(null);
  const [expenseForm, setExpenseForm] = useState<{ amount: string; memo: string } | null>(null);
  const [selfAmount, setSelfAmount] = useState('');
  const [selfUploading, setSelfUploading] = useState(false);

  const load = useCallback(async () => {
    const [l, s, m] = await Promise.all([listLedger(), getDuesSettings(), listMembers()]);
    setLedger(l);
    setSettings(s);
    setMembers(m);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const balance = getBalance(ledger);
  const expenses = ledger.filter((e) => e.type === 'expense');
  const myPaidThisMonth = user ? hasPaidThisMonth(ledger, user.id) : false;

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    try {
      const ocr = await uploadReceiptAndRecognize(result.assets[0].uri);
      setOcrPreview(ocr);
    } catch (e) {
      alert('업로드 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const confirmOcr = async () => {
    if (!ocrPreview) return;
    try {
      const matched = members.find((m) => m.nickname === ocrPreview.memberName || m.realName === ocrPreview.memberName);
      await confirmIncome(ocrPreview, matched?.id);
      setOcrPreview(null);
      load();
    } catch (e) {
      alert('등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleSelfUpload = async () => {
    const amount = Number(selfAmount) || settings?.monthlyFee || 0;
    if (!amount) {
      alert('금액을 입력해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    setSelfUploading(true);
    try {
      await uploadOwnReceipt(result.assets[0].uri, amount);
      setSelfAmount('');
      await load();
      alert('등록 완료', '납부 내역이 등록되었습니다.');
    } catch (e) {
      alert('업로드 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setSelfUploading(false);
    }
  };

  const toggleDepositNotify = async (value: boolean) => {
    if (!settings) return;
    const next = { ...settings, notifyOn: value };
    setSettings(next);
    try {
      await updateDuesSettings(next);
    } catch (e) {
      alert('설정 저장 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="회비" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <GateGuard permission="viewDuesBalance">
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>카카오뱅크 잔액</Text>
            <Text style={styles.balanceValue}>{balance.toLocaleString()}원</Text>
            <Text style={styles.balanceSub}>이번 달 회비 {settings?.monthlyFee.toLocaleString()}원 · 매월 {settings?.depositDay}일 납부</Text>
          </View>
        </GateGuard>

        <GateGuard permission="viewPaymentStatus">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이번 달 납부 현황</Text>
            {members.map((m) => {
              const paid = hasPaidThisMonth(ledger, m.id);
              return (
                <View key={m.id} style={styles.paymentRow}>
                  <Text style={styles.paymentName}>{m.nickname}</Text>
                  <Text style={[styles.paymentStatus, paid ? styles.paid : styles.unpaid]}>
                    {paid ? '완납' : '미납'}
                  </Text>
                </View>
              );
            })}
          </View>
        </GateGuard>

        <GateGuard permission="selfUploadReceipt">
          <View style={styles.section}>
            <View style={styles.paymentRow}>
              <Text style={styles.sectionTitle}>내 회비 납부</Text>
              <Text style={[styles.paymentStatus, myPaidThisMonth ? styles.paid : styles.unpaid]}>
                {myPaidThisMonth ? '완납' : '미납'}
              </Text>
            </View>
            {!myPaidThisMonth && (
              <View style={styles.ocrPreview}>
                <TextInput
                  style={styles.ocrInput}
                  placeholder={`금액 (기본 ${settings?.monthlyFee.toLocaleString() ?? ''}원)`}
                  keyboardType="number-pad"
                  value={selfAmount}
                  onChangeText={setSelfAmount}
                />
                <TouchableOpacity style={styles.uploadButton} onPress={handleSelfUpload} disabled={selfUploading}>
                  <Text style={styles.uploadButtonText}>{selfUploading ? '업로드 중...' : '입금 캡처 올리고 납부 등록'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GateGuard>

        <GateGuard permission="uploadReceipt">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>입금 캡처 업로드 (OCR 자동 등록)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>카카오뱅크 알림 캡처 업로드</Text>
            </TouchableOpacity>
            {ocrPreview && (
              <View style={styles.ocrPreview}>
                <Text style={styles.ocrTag}>{ocrPreview.recognized ? '자동인식' : '직접 입력'}</Text>
                {!ocrPreview.recognized && (
                  <Text style={styles.ocrHint}>자동 인식에 실패했어요. 회원명과 금액을 직접 입력해주세요.</Text>
                )}
                <TextInput
                  style={styles.ocrInput}
                  value={ocrPreview.memberName}
                  onChangeText={(v) => setOcrPreview({ ...ocrPreview, memberName: v })}
                />
                <TextInput
                  style={styles.ocrInput}
                  value={String(ocrPreview.amount)}
                  keyboardType="number-pad"
                  onChangeText={(v) => setOcrPreview({ ...ocrPreview, amount: Number(v) || 0 })}
                />
                <TouchableOpacity style={styles.confirmButton} onPress={confirmOcr}>
                  <Text style={styles.confirmButtonText}>확정 등록</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.depositRow}>
              <Text style={styles.depositLabel}>입금일 알림 (매월 {settings?.depositDay}일)</Text>
              <Switch value={settings?.notifyOn ?? false} onValueChange={toggleDepositNotify} />
            </View>

            {expenseForm ? (
              <View style={styles.ocrPreview}>
                <TextInput
                  style={styles.ocrInput}
                  placeholder="금액"
                  keyboardType="number-pad"
                  value={expenseForm.amount}
                  onChangeText={(v) => setExpenseForm({ ...expenseForm, amount: v })}
                />
                <TextInput
                  style={styles.ocrInput}
                  placeholder="메모"
                  value={expenseForm.memo}
                  onChangeText={(v) => setExpenseForm({ ...expenseForm, memo: v })}
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={async () => {
                    try {
                      await addExpense(Number(expenseForm.amount) || 0, expenseForm.memo || '지출');
                      setExpenseForm(null);
                      load();
                    } catch (e) {
                      alert('지출 등록 실패', e instanceof Error ? e.message : String(e));
                    }
                  }}
                >
                  <Text style={styles.confirmButtonText}>등록</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.expenseButton} onPress={() => setExpenseForm({ amount: '', memo: '' })}>
                <Text style={styles.expenseButtonText}>+ 지출 등록</Text>
              </TouchableOpacity>
            )}
          </View>
        </GateGuard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>회비 사용처</Text>
          {expenses.map((e) => (
            <View key={e.id} style={styles.expenseRow}>
              <Text style={styles.expenseMemo}>{e.memo}</Text>
              <Text style={styles.expenseAmount}>-{e.amount.toLocaleString()}원</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  balanceCard: { backgroundColor: colors.cardDark, borderRadius: radius.card, padding: spacing.lg, minHeight: 110 },
  balanceLabel: { color: colors.goldLight, fontSize: 12 },
  balanceValue: { color: colors.white, fontSize: 26, fontWeight: '800', marginTop: 6 },
  balanceSub: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  section: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  paymentName: { color: colors.text, fontWeight: '600' },
  paymentStatus: { fontWeight: '700', fontSize: 12 },
  paid: { color: colors.success },
  unpaid: { color: colors.danger },
  uploadButton: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  uploadButtonText: { color: colors.white, fontWeight: '700' },
  ocrPreview: { marginTop: spacing.md, gap: spacing.sm },
  ocrTag: { alignSelf: 'flex-start', backgroundColor: colors.cream, color: colors.creamText, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  ocrHint: { color: colors.textMuted, fontSize: 12 },
  ocrInput: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: 10 },
  confirmButton: { backgroundColor: colors.success, borderRadius: radius.pill, paddingVertical: 10, alignItems: 'center' },
  confirmButtonText: { color: colors.white, fontWeight: '700' },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  depositLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  expenseButton: { marginTop: spacing.md, alignItems: 'center' },
  expenseButtonText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  expenseMemo: { color: colors.text },
  expenseAmount: { color: colors.text, fontWeight: '700' },
});
