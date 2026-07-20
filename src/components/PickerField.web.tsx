import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';

// A calendar/clock button whose whole surface is an invisible native
// <input type="date|time">. Tapping it opens iOS/Android's own calendar or
// time wheel; the value flows back through onChange. The visible text field
// beside it (in CreateScheduleScreen) still allows manual typing, so both
// input methods work. Web-only — native uses PickerField.tsx.
export function PickerField({
  mode,
  value,
  onChange,
}: {
  mode: 'date' | 'time';
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.button}>
      <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={colors.gold} />
      {React.createElement('input', {
        type: mode,
        value,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        // A time wheel wants 5-minute steps like the native picker.
        step: mode === 'time' ? 300 : undefined,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          border: 'none',
          margin: 0,
          padding: 0,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tile,
    padding: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
