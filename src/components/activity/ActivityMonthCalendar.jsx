import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, space } from '../../theme/opengym';
import {
  MONTHS_LONG,
  todayISO,
} from '../../services/activityCalendarService';

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * openGym-style month calendar with trained-day dots.
 */
export default function ActivityMonthCalendar({ activityMap = {}, onDayPress }) {
  const [cur, setCur] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const y = cur.getFullYear();
  const mo = cur.getMonth();
  const today = todayISO();

  const { cells, monthCount } = useMemo(() => {
    const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7;
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < startOffset; i++) out.push(null);
    let count = 0;
    for (let d = 1; d <= daysIn; d++) {
      const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const a = activityMap[iso];
      if (a?.level > 0) count += 1;
      out.push({ d, iso, a, isToday: iso === today });
    }
    return { cells: out, monthCount: count };
  }, [y, mo, activityMap, today]);

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setCur(new Date(y, mo - 1, 1))}
        >
          <Ionicons name="chevron-back" size={20} color={colors.label} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {MONTHS_LONG[mo]} {y}
        </Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setCur(new Date(y, mo + 1, 1))}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.label} />
        </TouchableOpacity>
      </View>

      <Text style={styles.summary}>
        {monthCount === 0
          ? 'No active days this month'
          : `${monthCount} active day${monthCount === 1 ? '' : 's'}`}
      </Text>

      <View style={styles.grid}>
        {WEEK.map((l) => (
          <Text key={l} style={styles.head}>
            {l}
          </Text>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <View key={`e-${i}`} style={styles.day} />;
          const trained = cell.a?.level > 0;
          return (
            <TouchableOpacity
              key={cell.iso}
              style={[
                styles.day,
                trained && styles.dayHas,
                cell.isToday && styles.dayToday,
              ]}
              onPress={() => onDayPress?.(cell.iso, cell.a)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayNum, trained && styles.dayNumHas]}>
                {cell.d}
              </Text>
              <View
                style={[
                  styles.dot,
                  trained && styles.dotDone,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Active</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.label3 }]} />
          <Text style={styles.legendText}>Rest</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
    letterSpacing: -0.2,
  },
  summary: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.label3,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  head: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    color: colors.label3,
    fontWeight: '500',
    textTransform: 'uppercase',
    paddingVertical: 2,
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    gap: 3,
  },
  dayHas: {
    backgroundColor: colors.accentSoft,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.label,
  },
  dayNumHas: {
    color: colors.accent,
    fontWeight: '600',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'transparent',
  },
  dotDone: {
    backgroundColor: colors.accent,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.label3 },
});
