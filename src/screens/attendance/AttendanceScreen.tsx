import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radius, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import { checkIn, listEarlyBirds, listSchedules } from '../../data/schedules';
import { Attendance, Schedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { listMembers } from '../../data/users';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'Attendance'>;

const TROPHIES = ['🥇', '🥈', '🥉'];

export default function AttendanceScreen({ navigation }: Props) {
  const { user, refresh } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [earlyBirds, setEarlyBirds] = useState<(Attendance & { nickname: string })[]>([]);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [checkedIn, setCheckedIn] = useState(false);

  const load = useCallback(async () => {
    const schedules = await listSchedules();
    const current = schedules[0] ?? null;
    setSchedule(current);
    if (current) {
      const [attendances, members] = await Promise.all([listEarlyBirds(current.id), listMembers()]);
      setEarlyBirds(
        attendances.map((a) => ({ ...a, nickname: members.find((m) => m.id === a.userId)?.nickname ?? '회원' })),
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCheckIn = async () => {
    if (!schedule) return;
    try {
      await checkIn(schedule.id);
      setCheckedIn(true);
      setScanning(false);
      await load();
      await refresh();
      Alert.alert('체크인 완료', '출석이 등록되었습니다.');
    } catch (e) {
      Alert.alert('체크인 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('카메라 권한이 필요합니다. 수동 체크인으로 진행할게요.');
        handleCheckIn();
        return;
      }
    }
    setScanning(true);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="출석" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        {schedule ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrLabel}>진행 중인 모임</Text>
            <Text style={styles.qrTitle}>{schedule.title}</Text>
            <Text style={styles.qrMeta}>{schedule.place}</Text>

            {scanning && Platform.OS !== 'web' ? (
              <View style={styles.cameraBox}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={checkedIn ? undefined : () => handleCheckIn()}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.scanButton} onPress={checkedIn ? undefined : startScan} disabled={checkedIn}>
                <Text style={styles.scanButtonText}>{checkedIn ? '체크인 완료 ✓' : 'QR 체크인'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.empty}>진행 중인 모임이 없습니다</Text>
        )}

        <Text style={styles.sectionTitle}>오늘의 얼리버드</Text>
        <FlatList
          data={earlyBirds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item, index }) => (
            <View style={styles.rankRow}>
              <Text style={styles.rankTrophy}>{TROPHIES[index] ?? `${index + 1}`}</Text>
              <Text style={styles.rankName}>{item.nickname}</Text>
              <Text style={styles.rankTime}>{new Date(item.checkedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  qrCard: {
    backgroundColor: colors.cardDark,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  qrLabel: { color: colors.goldLight, fontSize: 12, alignSelf: 'flex-start' },
  qrTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginTop: 4, alignSelf: 'flex-start' },
  qrMeta: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg, alignSelf: 'flex-start' },
  cameraBox: { width: '100%', aspectRatio: 1, borderRadius: radius.tile, overflow: 'hidden' },
  scanButton: { backgroundColor: colors.gold, paddingVertical: 14, paddingHorizontal: spacing.xxl, borderRadius: radius.pill, width: '100%', alignItems: 'center' },
  scanButtonText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  rankTrophy: { fontSize: 16, width: 28 },
  rankName: { flex: 1, fontWeight: '600', color: colors.text },
  rankTime: { color: colors.textMuted, fontSize: 12 },
});
