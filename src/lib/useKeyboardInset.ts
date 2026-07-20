import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// The height actually visible above the on-screen keyboard, on mobile WEB.
//
// When the soft keyboard opens, the browser's visualViewport shrinks. By
// sizing the chat screen to exactly this height (instead of the full window),
// the input pinned to its bottom lands right above the keyboard - no browser
// auto-scroll (which was cutting off the top messages) and no leftover gap.
// Returns null on native, where the OS handles it (Android resize / iOS
// KeyboardAvoidingView) and this hook must not interfere.
export function useWebViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const update = () => setHeight(vv ? vv.height : window.innerHeight);
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return height;
}

// Like useWebViewportHeight, but also reports the visual viewport's top offset.
// On iOS Safari, focusing the input shifts the visual viewport down within the
// layout viewport (offsetTop > 0); pinning the chat screen with position:fixed
// at { top: offsetTop, height } keeps the header at the top of the *visible*
// area instead of letting it scroll off. Returns null on native.
export interface WebViewportRect {
  height: number;
  offsetTop: number;
}

export function useWebViewportRect(): WebViewportRect | null {
  const [rect, setRect] = useState<WebViewportRect | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const update = () =>
      setRect(vv ? { height: vv.height, offsetTop: vv.offsetTop } : { height: window.innerHeight, offsetTop: 0 });
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return rect;
}
