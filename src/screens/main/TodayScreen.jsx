import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import {
  IconTile,
  ListCard,
  ListRow,
  PageTitle,
  PillButton,
  ProgressBar,
  RoundButton,
  Screen,
  Section,
  StatTile,
  Txt,
} from '../../components/ui';
import { colors, radii } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';
import { getDiaryEntry } from '../../api/services/diaryService';
import {
  getStepsGoal,
  getTodayCaloriesBurned,
  getTodaySteps,
  initializeHealthKit,
  startStepTracking,
  stopStepTracking,
} from '../../services/healthService';
import { getTodayWaterIntake, getWaterGoal } from '../../services/waterIntakeService';
import { getActivityMap, markDayActive, todayISO } from '../../services/activityCalendarService';
import { toLocalISODate } from '../../utils/date';
import {
  bmiOf,
  calorieGoalsOf,
  firstName,
  fmt,
  setupProgress,
  todayLabel,
} from '../../utils/profileTargets';
import { formatWeight, useUnits } from '../../services/unitsService';
import { nextWorkoutSummary } from './trainState';

const RING = 196;
const R = 88;
const CIRC = 2 * Math.PI * R;

/** Consecutive active days ending today (or yesterday if today isn't active yet). */
export function streakFrom(map) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (!(map[toLocalISODate(d)]?.level > 0)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (map[toLocalISODate(d)]?.level > 0 && n < 366) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const SETUP_ROUTES = ['PersonalDetails', 'BodyEdit', 'PlanEdit', 'CalorieGoalsScreen', 'PersonalDetails'];
const SETUP_HINTS = [
  'Add your name and birthday to personalise targets',
  'Add your body stats to unlock BMI and calorie targets',
  'Pick a goal to get workouts and calories that fit',
  'Set your daily calorie target',
  'Add your location to finish your profile',
];

export default function TodayScreen({ navigation }) {
  const { user } = useAuth();
  const units = useUnits();
  const [profile, setProfile] = useState(null);
  const [steps, setSteps] = useState(0);
  const [stepGoal, setStepGoalState] = useState(10000);
  const [burned, setBurned] = useState(0);
  const [water, setWater] = useState({ litres: 0, goal: 3 });
  const [eaten, setEaten] = useState(0);
  const [streak, setStreak] = useState(0);
  const [workout, setWorkout] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const profileRef = useRef(null);

  const load = useCallback(async () => {
    const p = await fetchProfile().catch(() => null);
    profileRef.current = p;
    setProfile(p);

    const [s, goal, wl, wg, kcal, map, w] = await Promise.all([
      getTodaySteps().catch(() => 0),
      getStepsGoal().catch(() => 10000),
      getTodayWaterIntake().catch(() => 0),
      getWaterGoal().catch(() => 3),
      p ? getTodayCaloriesBurned(p).catch(() => 0) : 0,
      getActivityMap().catch(() => ({})),
      nextWorkoutSummary().catch(() => null),
    ]);
    setSteps(s || 0);
    setStepGoalState(goal || 10000);
    setWater({ litres: wl || 0, goal: wg || 3 });
    setBurned(kcal || 0);
    setStreak(streakFrom(map));
    setWorkout(w);
    if (s > 0) markDayActive(todayISO(), s >= 5000 ? 3 : s >= 1000 ? 2 : 1).catch(() => {});

    try {
      const entry = await getDiaryEntry(toLocalISODate());
      setEaten(parseFloat(entry?.totalCalories) || 0);
    } catch {
      setEaten(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    initializeHealthKit().then((ok) => {
      if (!ok) startStepTracking();
    });
    const id = setInterval(async () => {
      try {
        setSteps(await getTodaySteps());
        if (profileRef.current) setBurned(await getTodayCaloriesBurned(profileRef.current));
      } catch {
        /* ignore */
      }
    }, 30000);
    return () => {
      clearInterval(id);
      stopStepTracking();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const name = firstName(profile, user);
  const { bmi } = bmiOf(profile);
  const kcalGoal = calorieGoalsOf(profile).calories || 2000;
  const setup = setupProgress(profile);
  const stepRatio = stepGoal ? Math.min(1, steps / stepGoal) : 0;
  const strideM = profile?.heightCm ? (Number(profile.heightCm) * 0.415) / 100 : 0.75;
  const km = (steps * strideM) / 1000;
  const activeMin = Math.round(steps / 100);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageTitle
        eyebrow={todayLabel()}
        title={name ? `Hi, ${name}` : 'Hi there'}
        action={
          <RoundButton icon="sliders" label="Settings" onPress={() => navigation.navigate('Settings')} />
        }
      />

      {profile && setup.done < setup.total ? (
        <Pressable
          onPress={() => navigation.navigate(SETUP_ROUTES[setup.nextIndex] || 'Settings', { editMode: true, isEditing: true, userProfile: profile })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.setup, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.setupHead}>
            <Txt style={styles.setupTitle}>Finish setting up</Txt>
            <Txt style={styles.setupMeta}>
              {setup.done} of {setup.total} done
            </Txt>
          </View>
          <ProgressBar value={setup.done / setup.total} track={colors.inkTrack} fill={colors.lime} />
          <Txt style={styles.setupMeta}>{SETUP_HINTS[setup.nextIndex]}</Txt>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate('Activity')}
        accessibilityRole="button"
        accessibilityLabel={`${fmt(steps)} of ${fmt(stepGoal)} steps. Open activity`}
        style={({ pressed }) => [styles.stepsCard, pressed && { opacity: 0.9 }]}
      >
        <View style={{ width: RING, height: RING }}>
          <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke={colors.surface3} strokeWidth={10} />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              stroke={colors.ink}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${CIRC * stepRatio} ${CIRC}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Txt style={styles.ringValue}>{fmt(steps)}</Txt>
            <Txt style={styles.ringSub}>of {fmt(stepGoal)} steps</Txt>
          </View>
        </View>
        <View style={styles.triple}>
          <View style={styles.tripleCell}>
            <Txt style={styles.tripleValue}>{fmt(burned)}</Txt>
            <Txt style={styles.tripleLabel}>kcal burned</Txt>
          </View>
          <View style={[styles.tripleCell, styles.tripleMid]}>
            <Txt style={styles.tripleValue}>{km.toFixed(1)}</Txt>
            <Txt style={styles.tripleLabel}>km</Txt>
          </View>
          <View style={styles.tripleCell}>
            <Txt style={styles.tripleValue}>{activeMin}</Txt>
            <Txt style={styles.tripleLabel}>active min</Txt>
          </View>
        </View>
      </Pressable>

      <Section title="Today">
        <ListCard>
          <ListRow
            left={<IconTile name="water" />}
            onPress={() => navigation.navigate('Hydration')}
          >
            <View style={styles.rowHead}>
              <Txt style={styles.rowTitle}>Water</Txt>
              <Txt style={styles.rowValue}>
                {water.litres.toFixed(1)} / {water.goal.toFixed(1)} L
              </Txt>
            </View>
            <ProgressBar value={water.goal ? water.litres / water.goal : 0} style={{ marginTop: 6 }} />
          </ListRow>
          <ListRow left={<IconTile name="eat" />} onPress={() => navigation.navigate('Eat')}>
            <View style={styles.rowHead}>
              <Txt style={styles.rowTitle}>Calories</Txt>
              <Txt style={styles.rowValue}>
                {fmt(eaten)} / {fmt(kcalGoal)}
              </Txt>
            </View>
            <ProgressBar value={kcalGoal ? eaten / kcalGoal : 0} style={{ marginTop: 6 }} />
          </ListRow>
          <ListRow
            left={<IconTile name="train" />}
            title={workout?.title || 'Workout'}
            subtitle={workout?.subtitle || 'Open your plan'}
            onPress={() => navigation.navigate('Train')}
            right={<PillButton title="Start" onPress={() => navigation.navigate('Train')} />}
            last
          />
        </ListCard>
      </Section>

      <Section title="Body">
        <View style={styles.tiles}>
          <StatTile label="BMI" value={bmi ? bmi.toFixed(1) : '—'} />
          <StatTile
            label="Weight"
            value={profile?.weightKg ? formatWeight(Number(profile.weightKg), units).split(' ')[0] : '—'}
            unit={profile?.weightKg ? (units === 'imperial' ? 'lb' : 'kg') : null}
          />
          <StatTile label="Streak" value={streak} unit={streak === 1 ? 'day' : 'days'} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setup: { gap: 12, padding: 16, paddingHorizontal: 18, borderRadius: radii.card, backgroundColor: colors.ink },
  setupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setupTitle: { fontSize: 15, fontWeight: '600', color: colors.onInk },
  setupMeta: { fontSize: 13, color: colors.inkMuted },

  stepsCard: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 2 },
  ringValue: { fontSize: 40, fontWeight: '600', letterSpacing: -1.2 },
  ringSub: { fontSize: 14, color: colors.label2 },
  triple: { alignSelf: 'stretch', flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sep, paddingTop: 18 },
  tripleCell: { flex: 1, alignItems: 'center', gap: 2 },
  tripleMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.sep },
  tripleValue: { fontSize: 18, fontWeight: '600' },
  tripleLabel: { fontSize: 12, color: colors.label2 },

  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowValue: { fontSize: 14, color: colors.label2 },
  tiles: { flexDirection: 'row', gap: 10 },
});
