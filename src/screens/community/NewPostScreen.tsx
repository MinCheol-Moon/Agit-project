import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/types';
import { createPost, uploadPostImage } from '../../data/community';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<CommunityStackParamList, 'NewPost'>;

export default function NewPostScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!title || !body) return;
    setSubmitting(true);
    setError('');
    try {
      const imageUrl = imageUri ? await uploadPostImage(imageUri) : undefined;
      await createPost({ title, body, imageUrl });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="글쓰기" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput style={styles.titleInput} placeholder="제목" placeholderTextColor={colors.placeholder} value={title} onChangeText={setTitle} />
        <TextInput
          style={styles.bodyInput}
          placeholder="내용을 입력하세요"
          placeholderTextColor={colors.placeholder}
          value={body}
          onChangeText={setBody}
          multiline
        />

        {imageUri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.imageRemove} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={26} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={20} color={colors.gold} />
            <Text style={styles.photoButtonText}>사진 첨부</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={handleSubmit}>
          <Text style={styles.submitText}>{submitting ? '등록 중...' : '등록'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  titleInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 15, fontWeight: '700', color: colors.text },
  bodyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, padding: spacing.md, fontSize: 14, minHeight: 140, textAlignVertical: 'top', color: colors.text },
  photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, paddingVertical: 12 },
  photoButtonText: { color: colors.gold, fontWeight: '700' },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 220, borderRadius: radius.tile, backgroundColor: colors.line },
  imageRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.white, borderRadius: 13 },
  error: { color: colors.danger, fontSize: 12 },
  submitButton: { backgroundColor: colors.gold, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16, marginTop: spacing.sm },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
