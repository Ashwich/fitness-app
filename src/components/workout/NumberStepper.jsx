import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme/opengym';

/**
 * − / value / + stepper for sets & reps (workout mockup).
 */
export default function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}) {
  const n = Number(value) || 0;
  const dec = () => onChange(String(Math.max(min, n - 1)));
  const inc = () => onChange(String(Math.min(max, n + 1)));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={dec} hitSlop={8}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{n}</Text>
        <TouchableOpacity style={styles.btn} onPress={inc} hitSlop={8}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.label3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.accent,
    lineHeight: 22,
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.label,
  },
});
