import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Card,
  IconTile,
  ListCard,
  ListRow,
  PageTitle,
  RoundButton,
  Screen,
  Section,
  Txt,
} from '../../components/ui';
import { colors } from '../../theme/opengym';
import { fetchProfile } from '../../api/services/profileService';
import { getDiaryEntry } from '../../api/services/diaryService';
import { getActiveDiet } from '../../api/services/dietService';
import { toLocalISODate } from '../../utils/date';
import { calorieGoalsOf, fmt, todayLabel } from '../../utils/profileTargets';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'brunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

const MACRO_COLORS = [colors.ink, colors.label2, '#B5B5AE'];

const itemName = (i) => i?.foodName || i?.name || 'Food';
const mealKcal = (items) => (items || []).reduce((t, i) => t + (parseFloat(i?.calories) || 0), 0);

export default function EatScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [entry, setEntry] = useState(null);
  const [diet, setDiet] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, e, d] = await Promise.all([
      fetchProfile().catch(() => null),
      getDiaryEntry(toLocalISODate()).catch(() => null),
      getActiveDiet().catch(() => null),
    ]);
    setProfile(p);
    setEntry(e);
    setDiet(d);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goals = calorieGoalsOf(profile);
  const kcalGoal = goals.calories || 2000;
  const eaten = parseFloat(entry?.totalCalories) || 0;
  const left = Math.max(0, kcalGoal - eaten);
  const macros = [
    { label: 'Protein', got: parseFloat(entry?.totalProtein) || 0, goal: goals.protein, kcalPerG: 4 },
    { label: 'Carbs', got: parseFloat(entry?.totalCarbs) || 0, goal: goals.carbs, kcalPerG: 4 },
    { label: 'Fats', got: parseFloat(entry?.totalFat) || 0, goal: goals.fat, kcalPerG: 9 },
  ];
  const share = (m) => Math.min(1, (m.got * m.kcalPerG) / kcalGoal);

  const openDiary = (meal) => navigation.navigate('NutritionDiaryScreen', meal ? { addMeal: meal } : undefined);

  const plan = diet?.plan;
  const planTitle = plan ? plan.title || plan.name || 'Your diet plan' : 'Diet plans';
  const planSub = plan
    ? diet?.source === 'TRAINER'
      ? 'From your trainer'
      : 'Active plan'
    : 'Pick a plan for your goal';

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <PageTitle
        eyebrow={todayLabel()}
        title="Eat"
        action={<RoundButton icon="book" label="Food diary" onPress={() => openDiary()} />}
      />

      <Card style={{ gap: 18, paddingVertical: 22 }}>
        <View style={styles.totals}>
          <View style={{ gap: 4 }}>
            <Txt style={styles.caption}>Eaten</Txt>
            <Txt style={styles.big}>{fmt(eaten)}</Txt>
          </View>
          <View style={{ gap: 4, alignItems: 'flex-end' }}>
            <Txt style={styles.caption}>Left</Txt>
            <Txt style={styles.left}>
              {fmt(left)}
              <Txt style={styles.unit}> kcal</Txt>
            </Txt>
          </View>
        </View>
        <View
          style={styles.stack}
          accessible
          accessibilityLabel={`${fmt(eaten)} of ${fmt(kcalGoal)} kcal: protein, carbs and fats`}
        >
          {macros.map((m, i) =>
            share(m) > 0 ? (
              <View key={m.label} style={[styles.seg, { flex: share(m), backgroundColor: MACRO_COLORS[i] }]} />
            ) : null,
          )}
          <View style={[styles.seg, { flex: Math.max(0.0001, 1 - macros.reduce((t, m) => t + share(m), 0)), backgroundColor: colors.surface3 }]} />
        </View>
        <View style={styles.macroGrid}>
          {macros.map((m, i) => (
            <View key={m.label} style={{ flex: 1, gap: 4 }}>
              <View style={styles.legend}>
                <View style={[styles.dot, { backgroundColor: MACRO_COLORS[i] }]} />
                <Txt style={styles.caption13}>{m.label}</Txt>
              </View>
              <Txt style={styles.macroValue}>
                {Math.round(m.got)}
                <Txt style={styles.macroGoal}>{m.goal ? ` / ${m.goal} g` : ' g'}</Txt>
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      <Section title="Meals">
        <ListCard>
          {MEALS.map((meal, i) => {
            const items = entry?.[meal.key] || [];
            const kcal = mealKcal(items);
            const last = i === MEALS.length - 1;
            if (!items.length) {
              return (
                <ListRow
                  key={meal.key}
                  title={meal.label}
                  subtitle="Nothing logged yet"
                  last={last}
                  onPress={() => openDiary(meal.key)}
                  right={
                    <RoundButton
                      icon="plus"
                      label={`Add ${meal.label.toLowerCase()}`}
                      bg={colors.lime}
                      onPress={() => openDiary(meal.key)}
                    />
                  }
                />
              );
            }
            return (
              <ListRow
                key={meal.key}
                title={meal.label}
                subtitle={items.map(itemName).join(', ')}
                last={last}
                onPress={() => openDiary(meal.key)}
                right={
                  <Txt style={styles.mealKcal}>
                    {fmt(kcal)}
                    <Txt style={styles.macroGoal}> kcal</Txt>
                  </Txt>
                }
              />
            );
          })}
        </ListCard>
      </Section>

      <Section title="Plans">
        <ListCard style={{ paddingVertical: 0 }}>
          <ListRow
            left={<IconTile name="leaf" />}
            title={planTitle}
            subtitle={planSub}
            chevron
            last
            onPress={() => navigation.navigate('DietPlans')}
          />
        </ListCard>
      </Section>

      <Button title="Log a meal" onPress={() => openDiary()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  caption: { fontSize: 14, color: colors.label2 },
  caption13: { fontSize: 13, color: colors.label2 },
  big: { fontSize: 44, fontWeight: '600', letterSpacing: -1.3, lineHeight: 50, includeFontPadding: false },
  left: { fontSize: 22, fontWeight: '600' },
  unit: { fontSize: 14, fontWeight: '500', color: colors.label2 },
  stack: { flexDirection: 'row', gap: 3, height: 10 },
  seg: { borderRadius: 5, height: 10 },
  macroGrid: { flexDirection: 'row', gap: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroValue: { fontSize: 17, fontWeight: '600' },
  macroGoal: { fontSize: 13, fontWeight: '500', color: colors.label2 },
  mealKcal: { fontSize: 15, fontWeight: '600' },
});
