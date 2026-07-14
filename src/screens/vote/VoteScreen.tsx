import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import { listVotes, respond } from '../../data/votes';
import { Vote } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'Vote'>;

export default function VoteScreen({ navigation }: Props) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [tab, setTab] = useState<'ongoing' | 'closed'>('ongoing');

  const load = useCallback(() => {
    listVotes().then(setVotes);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = votes.filter((v) => (tab === 'ongoing' ? new Date(v.deadline) > new Date() : new Date(v.deadline) <= new Date()));

  const handleVote = async (voteId: string, optionId: string) => {
    try {
      await respond(voteId, optionId);
      load();
    } catch (e) {
      Alert.alert('투표 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="투표" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'ongoing' && styles.tabActive]} onPress={() => setTab('ongoing')}>
          <Text style={[styles.tabText, tab === 'ongoing' && styles.tabTextActive]}>진행 중</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'closed' && styles.tabActive]} onPress={() => setTab('closed')}>
          <Text style={[styles.tabText, tab === 'closed' && styles.tabTextActive]}>마감</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((vote) => {
          const total = vote.options.reduce((sum, o) => sum + o.count, 0) || 1;
          return (
            <View key={vote.id} style={styles.card}>
              <Text style={styles.voteTitle}>{vote.title}</Text>
              <Text style={styles.voteMeta}>마감 {new Date(vote.deadline).toLocaleDateString('ko-KR')}</Text>
              {vote.options.map((option) => (
                <TouchableOpacity key={option.id} style={styles.optionRow} onPress={() => handleVote(vote.id, option.id)}>
                  <View style={styles.optionBarTrack}>
                    <View style={[styles.optionBarFill, { width: `${(option.count / total) * 100}%` }]} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label} ({option.count})</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  tabActive: { backgroundColor: colors.cardDark, borderColor: colors.cardDark },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  voteTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  voteMeta: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  optionRow: { marginBottom: spacing.sm },
  optionBarTrack: { height: 24, backgroundColor: colors.background, borderRadius: radius.tile, overflow: 'hidden', marginBottom: 4 },
  optionBarFill: { height: 24, backgroundColor: colors.gold },
  optionLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },
});
