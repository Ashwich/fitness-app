/**
 * The four setup forms from the redesign ("About you", "Your body", "Your plan",
 * "Your targets"). Controlled components: the onboarding flow and the Settings
 * edit screens own the state and decide when to save.
 */
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/opengym';
import {
  Card,
  ChoiceGrid,
  Field,
  Heading,
  ListCard,
  ListRow,
  Pill,
  RadioList,
  Section,
  Stepper,
  Txt,
} from '../ui';
import { DateField } from '../ui/DateField';
import { Slider } from '../ui/Slider';
import {
  ACTIVITY_LEVELS,
  DIET_TYPES,
  GENDERS,
  GOALS,
  SESSION_LENGTHS,
  fmt,
} from '../../utils/profileTargets';
import { bmiCategory, calculateBmi } from '../../utils/autoGoals';
import { cmToFtIn, kgToLb, useUnits } from '../../services/unitsService';

/* ------------------------------------------------------------ About you */

export function validateAbout(v) {
  const e = {};
  if (!v.fullName?.trim()) e.fullName = 'Please enter your name';
  if (!v.dateOfBirth) e.dateOfBirth = 'Please add your date of birth';
  if (!v.gender) e.gender = 'Please choose one';
  return e;
}

export function AboutYouForm({ value, onChange, errors = {} }) {
  const set = (k) => (x) => onChange({ ...value, [k]: x });
  const minDob = new Date();
  minDob.setFullYear(minDob.getFullYear() - 100);
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 10);
  return (
    <>
      <Heading title="About you" subtitle="Used to personalise your targets. Only you can see this." />
      <View style={styles.form}>
        <Field
          label="Full name"
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          value={value.fullName}
          onChangeText={set('fullName')}
          error={errors.fullName}
          returnKeyType="done"
        />
        <View>
          <DateField
            label="Date of birth"
            value={value.dateOfBirth}
            onChange={set('dateOfBirth')}
            maximumDate={maxDob}
            minimumDate={minDob}
          />
          {errors.dateOfBirth ? <Txt style={styles.error}>{errors.dateOfBirth}</Txt> : null}
        </View>
        <View style={styles.group}>
          <Txt style={styles.legend}>Gender</Txt>
          <ChoiceGrid options={GENDERS} value={value.gender} onChange={set('gender')} height={48} />
          {errors.gender ? <Txt style={styles.error}>{errors.gender}</Txt> : null}
        </View>
        <Field
          label="Location"
          placeholder="City, country"
          autoComplete="postal-address-locality"
          value={value.location}
          onChangeText={set('location')}
          returnKeyType="done"
        />
      </View>
    </>
  );
}

/* ------------------------------------------------------------ Your body */

export function BodyForm({ value, onChange }) {
  const units = useUnits();
  const bmi = calculateBmi(value.weightKg, value.heightCm);
  const cat = bmiCategory(bmi);
  const catLabel = cat === 'Healthy' ? 'Healthy range' : cat;
  const imperial = units === 'imperial';
  const h = cmToFtIn(value.heightCm);

  return (
    <>
      <Heading
        title="Your body"
        subtitle="Height and weight set your BMI, calorie target and workout suggestions."
      />
      <Card style={styles.sliderCard}>
        <View style={styles.sliderHead}>
          <Txt style={styles.sliderLabel}>Height</Txt>
          <Txt style={styles.sliderValue}>
            {imperial ? `${h.ft}′ ${h.inch}″` : value.heightCm}
            {imperial ? null : <Txt style={styles.sliderUnit}> cm</Txt>}
          </Txt>
        </View>
        <Slider
          label="Height in centimetres"
          min={130}
          max={220}
          value={value.heightCm}
          onChange={(x) => onChange({ ...value, heightCm: x })}
        />
        <View style={styles.sliderEnds}>
          <Txt style={styles.endLabel}>{imperial ? '4′ 3″' : '130'}</Txt>
          <Txt style={styles.endLabel}>{imperial ? '7′ 3″' : '220'}</Txt>
        </View>
      </Card>

      <Card style={styles.sliderCard}>
        <View style={styles.sliderHead}>
          <Txt style={styles.sliderLabel}>Weight</Txt>
          <Txt style={styles.sliderValue}>
            {imperial ? kgToLb(value.weightKg) : value.weightKg}
            <Txt style={styles.sliderUnit}>{imperial ? ' lb' : ' kg'}</Txt>
          </Txt>
        </View>
        <Slider
          label="Weight in kilograms"
          min={35}
          max={180}
          value={value.weightKg}
          onChange={(x) => onChange({ ...value, weightKg: x })}
        />
        <View style={styles.sliderEnds}>
          <Txt style={styles.endLabel}>{imperial ? '77' : '35'}</Txt>
          <Txt style={styles.endLabel}>{imperial ? '397' : '180'}</Txt>
        </View>
      </Card>

      <Card tone="ink" padding={0} style={styles.bmiCard}>
        <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
          <Txt style={styles.bmiCaption}>Body mass index</Txt>
          {catLabel ? <Pill>{catLabel}</Pill> : null}
        </View>
        <Txt style={styles.bmiValue}>{bmi ? bmi.toFixed(1) : '—'}</Txt>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------ Your plan */

export function PlanForm({ value, onChange }) {
  const set = (k) => (x) => onChange({ ...value, [k]: x });
  return (
    <>
      <Heading title="Your plan" subtitle="Your goal and routine shape your calories and workouts." />
      <Section title="Main goal">
        <ChoiceGrid options={GOALS} value={value.primaryGoal} onChange={set('primaryGoal')} />
      </Section>
      <Section title="How active are you?">
        <RadioList options={ACTIVITY_LEVELS} value={value.activityLevel} onChange={set('activityLevel')} />
      </Section>
      <Section title="Routine">
        <ListCard>
          <ListRow
            title="Workouts a week"
            right={
              <Stepper
                label="workouts a week"
                value={value.workoutsPerWeek}
                minWidth={28}
                onDecrease={() => set('workoutsPerWeek')(Math.max(1, value.workoutsPerWeek - 1))}
                onIncrease={() => set('workoutsPerWeek')(Math.min(7, value.workoutsPerWeek + 1))}
              />
            }
          />
          <View style={styles.sessionBlock}>
            <Txt style={styles.sessionTitle}>Session length</Txt>
            <ChoiceGrid
              options={SESSION_LENGTHS.map((d) => ({ value: d, label: `${d} min` }))}
              value={value.sessionMinutes}
              onChange={set('sessionMinutes')}
              columns={4}
              height={44}
              inset
            />
          </View>
        </ListCard>
      </Section>
    </>
  );
}

/* --------------------------------------------------------- Your targets */

export function TargetsForm({ goals, dietType, onDietType }) {
  const c = goals?.calorieGoals;
  return (
    <>
      <Heading
        title="Your targets"
        subtitle="Worked out from your body and plan. You can change any of these later in Settings."
      />
      <Card tone="ink" style={{ gap: 14 }}>
        <Txt style={styles.bmiCaption}>Daily calories</Txt>
        <Txt style={styles.kcal}>
          {c ? fmt(c.dailyCalories) : '—'}
          <Txt style={styles.kcalUnit}> kcal</Txt>
        </Txt>
        <View style={styles.macroRow}>
          {[
            ['Protein', c?.protein],
            ['Carbs', c?.carbs],
            ['Fats', c?.fat],
          ].map(([label, g]) => (
            <View key={label} style={styles.macro}>
              <Txt style={styles.macroLabel}>{label}</Txt>
              <Txt style={styles.macroValue}>{g ? `${g} g` : '—'}</Txt>
            </View>
          ))}
        </View>
      </Card>
      <ListCard>
        <ListRow title="Steps" subtitle="per day" value={goals ? fmt(goals.stepGoal) : '—'} />
        <ListRow title="Water" subtitle="litres per day" value={goals ? `${goals.waterGoalLiters} L` : '—'} last />
      </ListCard>
      <Section title="What do you eat?">
        <ChoiceGrid options={DIET_TYPES} value={dietType} onChange={onDietType} columns={3} height={48} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  group: { gap: 8 },
  legend: { fontSize: 13, fontWeight: '600', color: colors.label2, paddingHorizontal: 4 },
  error: { fontSize: 12, color: colors.red, paddingHorizontal: 4, marginTop: 6 },

  sliderCard: { gap: 6 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderLabel: { fontSize: 15, fontWeight: '600' },
  sliderValue: { fontSize: 32, fontWeight: '600', letterSpacing: -0.64 },
  sliderUnit: { fontSize: 15, fontWeight: '500', color: colors.label2, letterSpacing: 0 },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: 12, color: colors.label2 },

  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  bmiCaption: { fontSize: 13, color: colors.inkMuted },
  bmiValue: { fontSize: 40, fontWeight: '600', letterSpacing: -1.2, color: colors.onInk },

  sessionBlock: { gap: 12, paddingTop: 14, paddingBottom: 16 },
  sessionTitle: { fontSize: 15, fontWeight: '600' },

  kcal: { fontSize: 44, fontWeight: '600', letterSpacing: -1.3, color: colors.onInk },
  kcalUnit: { fontSize: 16, fontWeight: '500', color: colors.inkMuted, letterSpacing: 0 },
  macroRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.inkTrack, paddingTop: 14 },
  macro: { flex: 1, gap: 2 },
  macroLabel: { fontSize: 12, color: colors.inkMuted },
  macroValue: { fontSize: 17, fontWeight: '600', color: colors.onInk },
});
