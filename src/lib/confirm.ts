import { alert } from './alert';

export function confirmDestructive(title: string, message: string, onConfirm: () => void): void {
  alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: onConfirm },
  ]);
}
