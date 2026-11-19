import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Card,
  ListCard,
  ListRow,
  Pill,
  Screen,
  Section,
  Segmented,
  Stepper,
  TopBar,
  Txt,
  WeekBars,
} from '../../components/ui';
import { colors } from '../../theme/opengym';
import {
  getCalorieBurnGoal,
  getStepsGoal,
  getStepsHistory,
  getTodaySteps,
  setCalorieBurnGoal,
  setStepsGoal,
} from '../../services/healthService';
import { fmt, lastSevenDayLetters } from '../../utils/profileTargets';

export default function ActivityScreen({ navigation }) {
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(10000);
  const [kcal, setKcal] = useState(400);
  const [range, setRange] = useState('week');
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, g, k, h] = await Promise.all([
          getTodaySteps().catch(() => 0),
          getStepsGoal().catch(() => 10000),
          getCalorieBurnGoal().catch(() => 400),
          getStepsHistory(30).catch(() => ({})),
        ]);
        setSteps(s || 0);
        setGoal(g || 10000);
        setKcal(k || 400);
        const values = Object.values(h);
        if (values.length) values[values.length - 1] = Math.max(values[values.length - 1], s || 0);
        setHistory(values);
        setDirty(false);
      })();
    }, []),
  );

  const shown = range === 'week' ? history.slice(-7) : history;
  const max = Math.max(goal, ...shown, 1);
  const total = shown.reduce((t, v) => t + v, 0);
  const avg = shown.length ? Math.round(total / shown.length) : 0;
  const pct = goal ? Math.min(100, Math.round((steps / goal) * 100)) : 0;
  const toGo = steps >= goal ? 'Goal reached' : `${fmt(goal - steps)} to go`;

  const save = async () => {
    setSaving(true);
    await Promise.all([setStepsGoal(goal), setCalorieBurnGoal(kcal)]);
    setSaving(false);
    setDirty(false);
    Alert.alert('Goals saved', 'Your daily goals are updated.');
  };

  return (
    <Screen header={<TopBar onBack={() => navigation.goBack()} title="Activity" />}>
      <View style={styles.hero}>
        <Txt style={styles.caption}>Steps today</Txt>
        <Txt style={styles.display}>{fmt(steps)}</Txt>
        <View style={styles.heroMeta}>
          <Pill>{`${pct}%`}</Pill>
          <Txt style={styles.caption}>
            {toGo} · goal {fmt(goal)}
          </Txt>
        </View>
      </View>

      <Card style={{ gap: 20 }}>
        <View style={styles.cardHead}>
          <Txt style={styles.cardTitle}>{range === 'week' ? 'Last 7 days' : 'Last 30 days'}</Txt>
          <Segmented
            inset
            value={range}
            onChange={setRange}
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </View>
        <View>
          <View style={styles.goalLine} />
          <WeekBars
            values={shown.map((v) => v / max)}
            labels={range === 'week' ? lastSevenDayLetters() : null}
            height={range === 'week' ? 144 : 120}
            gap={range === 'week' ? 12 : 3}
          />
        </View>
        <View style={styles.totals}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={styles.cap}>{range === 'week' ? 'Weekly total' : 'Monthly total'}</Txt>
            <Txt style={styles.totalValue}>{fmt(total)}</Txt>
          </View>
          <View style={[{ flex: 1, gap: 2 }, styles.totalRight]}>
            <Txt style={styles.cap}>Daily average</Txt>
            <Txt style={styles.totalValue}>{fmt(avg)}</Txt>
          </View>
        </View>
      </Card>

      <Section title="Daily goals">
        <ListCard>
          <ListRow
            title="Steps"
            subtitle="per day"
            right={
              <Stepper
                label="step goal"
                value={fmt(goal)}
                onDecrease={() => {
                  setGoal(Math.max(1000, goal - 500));
                  setDirty(true);
                }}
                onIncrease={() => {
                  setGoal(Math.min(30000, goal + 500));
                  setDirty(true);
                }}
              />
            }
          />
          <ListRow
            title="Active burn"
            subtitle="kcal per day"
            last
            right={
              <Stepper
                label="calorie goal"
                value={kcal}
                onDecrease={() => {
                  setKcal(Math.max(50, kcal - 50));
                  setDirty(true);
                }}
                onIncrease={() => {
                  setKcal(Math.min(2000, kcal + 50));
                  setDirty(true);
                }}
              />
            }
          />
        </ListCard>
      </Section>

      <Button title="Save goals" onPress={save} loading={saving} disabled={!dirty} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6, paddingHorizontal: 4, paddingTop: 8 },
  caption: { fontSize: 14, color: colors.label2 },
  display: { fontSize: 64, fontWeight: '600', letterSpacing: -2.5, lineHeight: 66 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  goalLine: { position: 'absolute', left: 0, right: 0, top: 4, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.ring },
  totals: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sep, paddingTop: 16 },
  totalRight: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.sep },
  cap: { fontSize: 12, color: colors.label2 },
  totalValue: { fontSize: 22, fontWeight: '600' },
});
