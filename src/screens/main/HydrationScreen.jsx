import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Card,
  Icon,
  ListCard,
  ListRow,
  Pill,
  Screen,
  Stepper,
  Switch,
  TopBar,
  Txt,
  WeekBars,
} from '../../components/ui';
import { colors, radii } from '../../theme/opengym';
import {
  addWaterIntake,
  areRemindersEnabled,
  getTodayWaterIntake,
  getWaterGoal,
  getWeeklyWaterIntake,
  setWaterGoal,
  setupWaterReminders,
} from '../../services/waterIntakeService';
import { markDayActive, todayISO } from '../../services/activityCalendarService';
import { lastSevenDayLetters } from '../../utils/profileTargets';

const TUBE_H = 240;

export default function HydrationScreen({ navigation }) {
  const [litres, setLitres] = useState(0);
  const [goal, setGoal] = useState(3);
  const [week, setWeek] = useState([]);
  const [reminders, setReminders] = useState(false);
  const [log, setLog] = useState([]);
  const goalTimer = useRef(null);

  const load = useCallback(async () => {
    const [l, g, w, r] = await Promise.all([
      getTodayWaterIntake().catch(() => 0),
      getWaterGoal().catch(() => 3),
      getWeeklyWaterIntake().catch(() => ({})),
      areRemindersEnabled().catch(() => false),
    ]);
    setLitres(l || 0);
    setGoal(g || 3);
    setWeek(Object.values(w || {}));
    setReminders(!!r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => () => clearTimeout(goalTimer.current), []);

  const add = async (l) => {
    const total = await addWaterIntake(l);
    setLitres(total);
    setLog((x) => [...x, l]);
    setWeek((w) => (w.length ? [...w.slice(0, -1), total] : [total]));
    markDayActive(todayISO(), 1).catch(() => {});
  };

  const undo = async () => {
    if (!log.length) return;
    const last = log[log.length - 1];
    const total = await addWaterIntake(-Math.min(last, litres));
    setLitres(Math.max(0, total));
    setLog((x) => x.slice(0, -1));
    setWeek((w) => (w.length ? [...w.slice(0, -1), Math.max(0, total)] : w));
  };

  const changeGoal = (delta) => {
    const next = Math.round(Math.min(6, Math.max(1, goal + delta)) * 100) / 100;
    setGoal(next);
    clearTimeout(goalTimer.current);
    goalTimer.current = setTimeout(() => setWaterGoal(next), 600);
  };

  const toggleReminders = async (on) => {
    setReminders(on);
    try {
      await setupWaterReminders(on, 2);
      if (on && !(await areRemindersEnabled())) {
        setReminders(false);
        Alert.alert('Notifications are off', 'Allow notifications for Fitsera in Settings to get water reminders.');
      }
    } catch {
      setReminders(!on);
    }
  };

  const ratio = goal ? Math.min(1, litres / goal) : 0;
  const pct = goal ? Math.round((litres / goal) * 100) : 0;
  const avg = week.length ? week.reduce((t, v) => t + v, 0) / week.length : 0;
  const weekMax = Math.max(goal, ...week, 0.1);
  const goalLabel = String(Math.round(goal * 100) / 100);

  return (
    <Screen
      header={
        <TopBar
          icon="close"
          backLabel="Close"
          onBack={() => navigation.goBack()}
          title="Water"
          right={
            <Pressable
              onPress={undo}
              disabled={!log.length}
              accessibilityRole="button"
              style={({ pressed }) => [styles.undo, (pressed || !log.length) && { opacity: 0.5 }]}
            >
              <Txt style={styles.undoText}>Undo</Txt>
            </Pressable>
          }
        />
      }
    >
      <Card padding={24} style={styles.hero}>
        <View style={{ gap: 8, paddingBottom: 4, flexShrink: 1 }}>
          <Txt style={styles.caption}>Today</Txt>
          <Txt style={styles.display}>
            {litres.toFixed(1)}
            <Txt style={styles.displayUnit}> L</Txt>
          </Txt>
          <Txt style={styles.caption}>of {goalLabel} L goal</Txt>
          <Pill style={{ marginTop: 8 }}>{`${pct}%`}</Pill>
        </View>
        <View style={styles.tube} accessible accessibilityLabel={`${pct}% of daily water goal`}>
          <View style={[styles.tubeFill, { height: Math.round(TUBE_H * ratio) }]} />
        </View>
      </Card>

      <View style={styles.quick} accessibilityLabel="Quick add">
        {[
          [0.25, '250 ml'],
          [0.5, '500 ml'],
          [1, '1 L'],
        ].map(([l, label], i) => {
          const ink = i === 2;
          return (
            <Pressable
              key={label}
              onPress={() => add(l)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${label}`}
              style={({ pressed }) => [styles.quickBtn, ink && { backgroundColor: colors.ink }, pressed && { opacity: 0.8 }]}
            >
              <Icon name="plus" size={20} strokeWidth={2} color={ink ? colors.onInk : colors.label} />
              <Txt style={[styles.quickLabel, ink && { color: colors.onInk }]}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <ListCard>
        <ListRow
          title="Reminders"
          subtitle="Every 2 hours, 8 am – 8 pm"
          right={<Switch value={reminders} onChange={toggleReminders} label="Water reminders" />}
        />
        <ListRow
          title="Daily goal"
          subtitle="litres per day"
          last
          right={
            <Stepper
              label="water goal"
              value={goalLabel}
              minWidth={48}
              onDecrease={() => changeGoal(-0.25)}
              onIncrease={() => changeGoal(0.25)}
            />
          }
        />
      </ListCard>

      <Card style={{ gap: 16 }}>
        <View style={styles.weekHead}>
          <Txt style={styles.weekTitle}>This week</Txt>
          <Txt style={styles.meta}>avg {avg.toFixed(1)} L</Txt>
        </View>
        <WeekBars values={(week.length ? week : [0, 0, 0, 0, 0, 0, litres]).map((v) => v / weekMax)} labels={lastSevenDayLetters()} />
      </Card>

      <Button title="Done" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  undo: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center' },
  undoText: { fontSize: 14, fontWeight: '600' },
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  caption: { fontSize: 14, color: colors.label2 },
  display: { fontSize: 64, fontWeight: '600', letterSpacing: -2.5, lineHeight: 70, includeFontPadding: false },
  displayUnit: { fontSize: 22, fontWeight: '500', color: colors.label2, letterSpacing: 0 },
  tube: { width: 96, height: TUBE_H, borderRadius: 48, backgroundColor: colors.surface3, overflow: 'hidden', justifyContent: 'flex-end' },
  tubeFill: { backgroundColor: colors.ink },
  quick: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    height: 88,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickLabel: { fontSize: 15, fontWeight: '600' },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  weekTitle: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: colors.label2 },
});
