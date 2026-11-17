import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/opengym';

/**
 * Calorie ring UI — pure RN Views (avoids broken react-native-svg on Expo Go).
 * Outer track + progress tint; center shows kcal remaining.
 */
export default function CalorieRing({
  consumed = 0,
  goal = 2000,
  size = 118,
  stroke = 10,
}) {
  const safeGoal = goal > 0 ? goal : 2000;
  const progress = Math.min(1, Math.max(0, consumed / safeGoal));
  const remaining = Math.max(0, Math.round(safeGoal - consumed));
  const pct = Math.round(progress * 100);
  const half = size / 2;
  const inner = size - stroke * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: colors.surface2,
          },
        ]}
      />
      {/* Progress indicator: green ring fades in with intake; thick accent arc via dual borders */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderTopColor: pct >= 5 ? colors.accent : colors.surface2,
            borderRightColor: pct >= 30 ? colors.accent : colors.surface2,
            borderBottomColor: pct >= 55 ? colors.accent : colors.surface2,
            borderLeftColor: pct >= 80 ? colors.accent : colors.surface2,
            opacity: 0.95,
          },
        ]}
      />
      <View
        style={[
          styles.inner,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
          },
        ]}
      >
        <Text style={styles.value}>{remaining.toLocaleString()}</Text>
        <Text style={styles.of}>of {Math.round(safeGoal).toLocaleString()}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.label,
    letterSpacing: -0.4,
  },
  of: {
    fontSize: 11,
    color: colors.label3,
    marginTop: 1,
  },
  unit: {
    fontSize: 11,
    color: colors.label3,
    fontWeight: '500',
  },
});
