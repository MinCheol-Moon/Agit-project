import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// How much the on-screen keyboard is covering the bottom of the screen on
// mobile WEB, so a chat input pinned to the bottom can be lifted above it.
//
// Native Android/iOS already handle this: Android via softwareKeyboardLayoutMode
// "resize" (window shrinks so the input rises on its own), iOS via
// KeyboardAvoidingView. Web has neither - react-native-web's Keyboard events
// don't fire for the on-screen keyboard - so the browser's visualViewport
// (which shrinks when the keyboard opens) is the only signal, and this is what
// was missing that left the input hidden behind the keyboard on mobile web.
// Returns 0 on native to avoid double-counting with the native mechanisms.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 80 ? covered : 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
