import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radii } from '../../theme/opengym';
import { MONTHS_SHORT, todayISO } from '../../services/activityCalendarService';
import { toLocalISODate } from '../../utils/date';

const CELL = 11;
const GAP = 3;

const levelColor = (level) => {
  if (!level) return colors.surface2;
  if (level === 1) return 'rgba(48,209,88,0.30)';
  if (level === 2) return 'rgba(48,209,88,0.55)';
  if (level === 3) return 'rgba(48,209,88,0.78)';
  return colors.accent;
};

/**
 * openGym / GitHub-style year activity heatmap.
 * activityMap: { 'YYYY-MM-DD': { level: 1-4 } }
 */
export default function ActivityHeatmap({ activityMap = {}, onDayPress }) {
  const scrollRef = useRef(null);
  const today = todayISO();

  const { months, cols } = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    // End on Monday of current week (Mon-start like openGym)
    const end = new Date(now);
    end.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const start = new Date(end);
    start.setDate(end.getDate() - 52 * 7);

    const monthLabels = [];
    const columns = [];
    let lastMonth = -1;

    for (let wk = 0; wk <= 52; wk++) {
      const colStart = new Date(start);
      colStart.setDate(start.getDate() + wk * 7);
      const mo = colStart.getMonth();
      const showM = mo !== lastMonth && colStart.getDate() <= 7 && wk < 51;
      monthLabels.push(showM ? MONTHS_SHORT[mo] : '');
      if (colStart.getDate() <= 7) lastMonth = mo;

      const cells = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(colStart);
        day.setDate(colStart.getDate() + d);
        const key = toLocalISODate(day);
        const a = activityMap[key];
        const level = a?.level || 0;
        const isFuture = day > now;
        const isToday = key === today;
        cells.push({ key, level, isFuture, isToday, a });
      }
      columns.push(cells);
    }
    return { months: monthLabels, cols: columns };
  }, [activityMap, today]);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [cols.length]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <View style={[styles.months, { marginLeft: 28 }]}>
            {months.map((m, i) => (
              <Text key={`m-${i}`} style={styles.monthLabel} numberOfLines={1}>
                {m}
              </Text>
            ))}
          </View>
          <View style={styles.body}>
            <View style={styles.dayLabels}>
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => (
                <Text key={`d-${i}`} style={styles.dayLabel}>
                  {l}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cols.map((cells, wi) => (
                <View key={`w-${wi}`} style={styles.col}>
                  {cells.map((cell) => (
                    <TouchableOpacity
                      key={cell.key}
                      disabled={!cell.a || cell.isFuture}
                      onPress={() => onDayPress?.(cell.key, cell.a)}
                      style={[
                        styles.cell,
                        { backgroundColor: levelColor(cell.level) },
                        cell.isToday && styles.today,
                        cell.isFuture && styles.future,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View key={l} style={[styles.legendCell, { backgroundColor: levelColor(l) }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  scrollContent: { paddingRight: 8 },
  months: { flexDirection: 'row', marginBottom: 5 },
  monthLabel: {
    width: CELL + GAP,
    fontSize: 10,
    color: colors.label3,
  },
  body: { flexDirection: 'row' },
  dayLabels: {
    width: 28,
    justifyContent: 'space-between',
    paddingVertical: 0,
    gap: GAP,
  },
  dayLabel: {
    height: CELL,
    fontSize: 10,
    color: colors.label2,
    lineHeight: CELL,
  },
  grid: { flexDirection: 'row', gap: GAP },
  col: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  future: { opacity: 0.3 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  legendText: { fontSize: 11, color: colors.label3 },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
