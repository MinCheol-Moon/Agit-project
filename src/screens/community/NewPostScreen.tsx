import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { createPost } from '../../data/community';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<CommunityStackParamList, 'NewPost'>;

export default function NewPostScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = async () => {
    if (!title || !body) return;
    await createPost({ title, body });
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="글쓰기" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput style={styles.titleInput} placeholder="제목" value={title} onChangeText={setTitle} />
        <TextInput
          style={styles.bodyInput}
          placeholder="내용을 입력하세요"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>등록</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  titleInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 15, fontWeight: '700' },
  bodyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 14, minHeight: 160, textAlignVertical: 'top' },
  submitButton: { backgroundColor: colors.gold, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16, marginTop: spacing.md },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
