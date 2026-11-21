import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Heading, Icon, Loading, Pill, Screen, Section, TopBar, Txt } from '../../components/ui';
import { DietChoiceList, macroLine, MealList } from '../../components/setup/PlanChoices';
import { colors } from '../../theme/opengym';
import { getActiveDiet, getSuggestedDiets } from '../../api/services/dietService';
import { fetchProfile } from '../../api/services/profileService';
import { normalizeMeals, planTotals, suggestDiets } from '../../data/dietLibrary';
import { calorieGoalsOf, fmt, primaryGoalOf } from '../../utils/profileTargets';
import { getReadableError } from '../../utils/apiError';
import { applySuggestedDiet, canQuickLog, logMealToday } from './dietState';

/** One-tap "Add" for a plan meal; falls back to the diary when foods have no calories. */
export function MealLogButton({ meal, onOpenDiary }) {
  const [state, setState] = useState('idle'); // idle | busy | done
  if (!canQuickLog(meal)) {
    return (
      <Pressable onPress={() => onOpenDiary(meal.key)} accessibilityRole="button" hitSlop={6} style={styles.logBtn}>
        <Txt style={styles.logText}>Log</Txt>
      </Pressable>
    );
  }
  const add = async () => {
    setState('busy');
    try {
      await logMealToday(meal);
      setState('done');
    } catch (e) {
      setState('idle');
      Alert.alert('Could not add', getReadableError(e));
    }
  };
  return (
    <Pressable
      onPress={state === 'idle' ? add : undefined}
      accessibilityRole="button"
      accessibilityLabel={state === 'done' ? `${meal.label} added to today` : `Add ${meal.label.toLowerCase()} to today`}
      hitSlop={6}
      style={[styles.logBtn, state === 'done' && { backgroundColor: colors.lime }]}
    >
      {state === 'busy' ? (
        <ActivityIndicator size="small" color={colors.label} />
      ) : state === 'done' ? (
        <View style={styles.logInner}>
          <Icon name="check" size={14} strokeWidth={2.25} />
          <Txt style={styles.logText}>Added</Txt>
        </View>
      ) : (
        <View style={styles.logInner}>
          <Icon name="plus" size={14} strokeWidth={2.25} />
          <Txt style={styles.logText}>Add</Txt>
        </View>
      )}
    </Pressable>
  );
}

function PlanCard({ eyebrow, plan, onOpenDiary }) {
  const meals = normalizeMeals(plan.meals);
  const totals = planTotals(meals);
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Pill tone="ink">{eyebrow}</Pill>
        <Txt style={styles.planTitle}>{plan.title || 'Your diet'}</Txt>
        {totals.calories ? (
          <Txt style={styles.planMeta}>{macroLine(totals)}</Txt>
        ) : plan.description ? (
          <Txt style={styles.planMeta}>{plan.description}</Txt>
        ) : null}
      </View>
      {meals.length ? (
        <>
          <Txt style={styles.hint}>Tap Add to log a meal to today’s diary.</Txt>
          <MealList meals={meals} renderMealAction={(m) => <MealLogButton meal={m} onOpenDiary={onOpenDiary} />} />
        </>
      ) : null}
    </Card>
  );
}

/** Trainer diet, your active plan, suggestions sized to your target, or build your own. */
export default function DietPlansScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [active, setActive] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [applying, setApplying] = useState(null);

  const load = useCallback(async () => {
    const [p, a, s] = await Promise.all([
      fetchProfile().catch(() => null),
      getActiveDiet().catch(() => null),
      getSuggestedDiets().catch(() => null),
    ]);
    setProfile(p);
    setActive(a?.source !== 'TRAINER' ? a?.plan || null : null);
    setTrainer(s?.trainerPlan || (a?.source === 'TRAINER' ? a.plan : null));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const kcal = calorieGoalsOf(profile).calories;
  const suggestions = useMemo(
    () =>
      suggestDiets({
        dietType: profile?.dietType,
        primaryGoal: primaryGoalOf(profile),
        calories: kcal || 2000,
      }),
    [profile, kcal],
  );
  const activeId = suggestions.find((s) => s.name === active?.title)?.id || null;

  const openDiary = (meal) => navigation.navigate('NutritionDiaryScreen', { addMeal: meal });

  const use = async (id) => {
    if (id === activeId || applying) return;
    const plan = suggestions.find((s) => s.id === id);
    setApplying(id);
    try {
      await applySuggestedDiet(plan);
      await load();
    } catch (e) {
      Alert.alert('Could not save plan', getReadableError(e));
    } finally {
      setApplying(null);
    }
  };

  return (
    <Screen header={<TopBar onBack={() => navigation.goBack()} title="Plans" />}>
      <Heading
        title="Diet plans"
        subtitle={kcal ? `Sized to your ${fmt(kcal)} kcal daily target.` : 'Pick a plan or build your own.'}
      />
      {loading ? <Loading /> : null}

      {!loading && trainer ? <PlanCard eyebrow="From your trainer" plan={trainer} onOpenDiary={openDiary} /> : null}
      {!loading && active ? <PlanCard eyebrow="Your plan" plan={active} onOpenDiary={openDiary} /> : null}

      {!loading ? (
        <Section title={active || trainer ? 'Switch plan' : 'Suggested for you'}>
          <Txt style={styles.hint}>Tap a plan to use it. {applying ? 'Saving…' : ''}</Txt>
          <DietChoiceList plans={suggestions} value={applying || activeId} onChange={use} />
        </Section>
      ) : null}

      {!loading ? (
        <Button
          title="Create my own diet"
          variant="secondary"
          icon="edit"
          onPress={() => navigation.navigate('CustomDiet')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  planTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  planMeta: { fontSize: 13, color: colors.label2, lineHeight: 18 },
  hint: { fontSize: 13, color: colors.label2, lineHeight: 18, paddingHorizontal: 4 },
  logBtn: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logText: { fontSize: 13, fontWeight: '600' },
});
