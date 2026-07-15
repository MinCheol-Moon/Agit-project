import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

// ponytail: react-native-web's Alert.alert is a complete no-op (its whole
// implementation is `static alert() {}`), so no alert or confirm dialog has
// ever actually shown up on web - not the destructive confirms, not the
// error messages after a failed request, nothing. window.alert/confirm are
// the platform's real equivalent there; native keeps the real Alert.
export function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }
  const text = [title, message].filter(Boolean).join('\n\n');
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
