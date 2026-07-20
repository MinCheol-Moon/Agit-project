import React from 'react';
import { colors } from '../theme/colors';

// Web send button rendered as a real <button> so we can preventDefault on
// pointer/mouse down: that stops the tap from blurring the message input,
// which would otherwise close the keyboard and make the viewport (and the
// message list) jump up on every send. onSubmitEditing already covers the
// keyboard's own send key.
export function SendButton({ onPress }: { onPress: () => void }) {
  const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();
  return React.createElement(
    'button',
    {
      onMouseDown: keepFocus,
      onPointerDown: keepFocus,
      onClick: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        onPress();
      },
      style: {
        backgroundColor: colors.gold,
        color: colors.white,
        fontWeight: 700,
        fontSize: 14,
        border: 'none',
        borderRadius: 999,
        padding: '0 20px',
        cursor: 'pointer',
      },
    },
    '전송',
  );
}
