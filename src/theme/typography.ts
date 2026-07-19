import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Ionicons from '@expo/vector-icons/Ionicons';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export function useAppFonts() {
  // Ionicons.font is preloaded here explicitly: on the static web export the
  // icon font otherwise isn't registered before first paint, so every icon
  // renders as an empty tofu box. Preloading it (and gating render on it in
  // App.tsx) guarantees the glyphs are ready.
  return useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
  });
}
