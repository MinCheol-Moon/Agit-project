import React, { useState } from 'react';
import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius } from '../theme/colors';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Native (iOS/Android) calendar / time-wheel button. Web uses PickerField.web.tsx.
export function PickerField({
  mode,
  value,
  onChange,
}: {
  mode: 'date' | 'time';
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  const base =
    mode === 'date'
      ? new Date(`${value || new Date().toISOString().slice(0, 10)}T12:00:00`)
      : new Date(`2000-01-01T${value || '19:00'}:00`);

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setShow(true)}>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={colors.gold} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={Number.isNaN(base.getTime()) ? new Date() : base}
          mode={mode}
          display={mode === 'time' ? 'spinner' : Platform.OS === 'ios' ? 'inline' : 'calendar'}
          minuteInterval={mode === 'time' ? 5 : undefined}
          onChange={(_event, selected) => {
            setShow(Platform.OS === 'ios' ? false : false);
            if (selected) {
              if (mode === 'date') {
                onChange(`${selected.getFullYear()}-${pad2(selected.getMonth() + 1)}-${pad2(selected.getDate())}`);
              } else {
                onChange(`${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`);
              }
            }
          }}
        />
      )}
    </>
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
