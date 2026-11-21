/**
 * Pickers used by onboarding and the Eat/Train screens:
 *  - DietChoiceList: suggested day plans, tap to choose, expand to see meals
 *  - CustomDietEditor: your own macros + foods per meal
 *  - ProgramChoiceList: workout programs with filters
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, FONT_FAMILY, radii } from '../../theme/opengym';
import { Icon } from '../ui/Icon';
import { Button, Pill, Txt } from '../ui';
import { MEAL_SLOTS, planTotals } from '../../data/dietLibrary';
import { matchesFilter, PROGRAM_FILTERS, programMeta } from '../../data/workoutPrograms';
import { fmt } from '../../utils/profileTargets';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* ------------------------------------------------------------- shared */

function Radio({ on }) {
  return (
    <View style={[st.radio, { borderColor: on ? colors.ink : colors.ring }]}>
      {on ? <View style={st.radioDot} /> : null}
    </View>
  );
}

function ChoiceCard({ on, onPress, title, subtitle, meta, badge, expanded, onToggle, toggleLabel, children }) {
  return (
    <View style={[st.choice, on && st.choiceOn]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: !!on }}
        style={({ pressed }) => [st.choiceHead, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={st.titleRow}>
            <Txt style={st.choiceTitle}>{title}</Txt>
            {badge ? <Pill>{badge}</Pill> : null}
          </View>
          {subtitle ? <Txt style={st.choiceSub}>{subtitle}</Txt> : null}
          {meta ? <Txt style={st.choiceMeta}>{meta}</Txt> : null}
        </View>
        <Radio on={on} />
      </Pressable>
      {onToggle ? (
        <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={6} style={st.toggle}>
          <Txt style={st.toggleText}>{expanded ? 'Hide' : toggleLabel}</Txt>
          <View style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron" size={14} color={colors.label2} strokeWidth={2} />
          </View>
        </Pressable>
      ) : null}
      {expanded ? <View style={st.expand}>{children}</View> : null}
    </View>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[st.chip, on && { backgroundColor: colors.ink }]}
          >
            <Txt style={[st.chipText, on && { color: colors.onInk }]}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* --------------------------------------------------------------- diet */

export const macroLine = (t) =>
  t ? `${fmt(t.calories)} kcal · P ${t.protein} g · C ${t.carbs} g · F ${t.fat} g` : '';

export function MealList({ meals, renderMealAction }) {
  return (
    <View style={{ gap: 14 }}>
      {meals.map((m) => {
        const kcal = (m.items || []).reduce((t, i) => t + (Number(i.calories) || 0), 0);
        return (
          <View key={m.key + m.label} style={{ gap: 6 }}>
            <View style={st.mealHead}>
              <Txt style={st.mealTitle}>{m.label}</Txt>
              {kcal ? <Txt style={st.mealKcal}>{fmt(kcal)} kcal</Txt> : null}
              {renderMealAction ? renderMealAction(m) : null}
            </View>
            {(m.items || []).map((it, i) => (
              <View key={`${it.name}-${i}`} style={st.food}>
                <Txt style={st.foodName} numberOfLines={2}>
                  {it.name}
                  {it.qty ? <Txt style={st.foodQty}>{`  ${it.qty}`}</Txt> : null}
                </Txt>
                {it.calories ? <Txt style={st.foodKcal}>{fmt(it.calories)}</Txt> : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export function DietChoiceList({ plans, value, onChange }) {
  const [open, setOpen] = useState(null);
  return (
    <View style={{ gap: 10 }}>
      {plans.map((p, i) => (
        <ChoiceCard
          key={p.id}
          on={value === p.id}
          onPress={() => onChange(p.id)}
          title={p.name}
          subtitle={p.blurb}
          meta={macroLine(p.totals)}
          badge={i === 0 ? 'Best match' : null}
          expanded={open === p.id}
          onToggle={() => setOpen(open === p.id ? null : p.id)}
          toggleLabel="See meals"
        >
          <MealList meals={p.meals} />
        </ChoiceCard>
      ))}
    </View>
  );
}

const numText = (v) => (v === '' || v == null ? '' : String(v));
const toNum = (t) => {
  const n = parseFloat(String(t).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : '';
};

function NumBox({ label, unit, value, onChange }) {
  return (
    <View style={st.numBox}>
      <Txt style={st.numLabel}>{label}</Txt>
      <View style={st.numRow}>
        <TextInput
          value={numText(value)}
          onChangeText={(t) => onChange(toNum(t))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.label3}
          style={st.numInput}
          accessibilityLabel={label}
          maxLength={5}
        />
        <Txt style={st.numUnit}>{unit}</Txt>
      </View>
    </View>
  );
}

export const emptyCustomDiet = (targets = {}) => ({
  name: 'My diet',
  targets: {
    calories: targets.calories || '',
    protein: targets.protein || '',
    carbs: targets.carbs || '',
    fat: targets.fat || '',
  },
  meals: MEAL_SLOTS.map((m) => ({ ...m, items: [] })),
});

/** Validation message, or '' when the custom diet can be saved. */
export function validateCustomDiet(d) {
  const t = d.targets;
  if (!(Number(t.calories) >= 800)) return 'Enter your daily calories (800 or more).';
  if (!(Number(t.protein) > 0)) return 'Enter how much protein you want a day.';
  return '';
}

function FoodRow({ item, onChange, onRemove }) {
  const set = (k) => (v) => onChange({ ...item, [k]: v });
  return (
    <View style={st.foodEdit}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={item.name}
          onChangeText={set('name')}
          placeholder="Food, e.g. Paneer bhurji"
          placeholderTextColor={colors.label3}
          style={[st.textInput, { flex: 1 }]}
          accessibilityLabel="Food name"
          maxLength={80}
        />
        <TextInput
          value={item.qty}
          onChangeText={set('qty')}
          placeholder="Qty"
          placeholderTextColor={colors.label3}
          style={[st.textInput, { width: 82 }]}
          accessibilityLabel="Quantity"
          maxLength={20}
        />
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove food" hitSlop={8}>
          <Icon name="trash" size={18} color={colors.label2} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <NumBox label="kcal" unit="" value={item.calories} onChange={set('calories')} />
        <NumBox label="Protein" unit="g" value={item.protein} onChange={set('protein')} />
        <NumBox label="Carbs" unit="g" value={item.carbs} onChange={set('carbs')} />
        <NumBox label="Fat" unit="g" value={item.fat} onChange={set('fat')} />
      </View>
    </View>
  );
}

/** Your own macros, plus optional foods for each meal. */
export function CustomDietEditor({ value, onChange }) {
  const t = value.targets;
  const setTarget = (k) => (v) => onChange({ ...value, targets: { ...t, [k]: v } });
  const macroKcal = Math.round((Number(t.protein) || 0) * 4 + (Number(t.carbs) || 0) * 4 + (Number(t.fat) || 0) * 9);
  const foodTotals = useMemo(() => planTotals(value.meals), [value.meals]);
  const hasFoods = value.meals.some((m) => m.items.length);

  const setMeal = (mi, items) =>
    onChange({ ...value, meals: value.meals.map((m, i) => (i === mi ? { ...m, items } : m)) });

  return (
    <View style={{ gap: 16 }}>
      <View style={st.card}>
        <Txt style={st.cardTitle}>Daily targets</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <NumBox label="Calories" unit="kcal" value={t.calories} onChange={setTarget('calories')} />
          <NumBox label="Protein" unit="g" value={t.protein} onChange={setTarget('protein')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <NumBox label="Carbs" unit="g" value={t.carbs} onChange={setTarget('carbs')} />
          <NumBox label="Fat" unit="g" value={t.fat} onChange={setTarget('fat')} />
        </View>
        {macroKcal > 0 ? (
          <View style={st.hintRow}>
            <Txt style={st.hint}>Your macros add up to {fmt(macroKcal)} kcal.</Txt>
            {Math.abs(macroKcal - (Number(t.calories) || 0)) > 50 ? (
              <Pressable onPress={() => setTarget('calories')(macroKcal)} accessibilityRole="button" hitSlop={6}>
                <Txt style={st.link}>Use this</Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Txt style={st.sectionTitle}>Your meals (optional)</Txt>
        <Txt style={st.hint}>Add the foods you eat. You can add each meal to your diary with one tap later.</Txt>
      </View>

      {value.meals.map((m, mi) => (
        <View key={m.key} style={st.card}>
          <Txt style={st.cardTitle}>{m.label}</Txt>
          {m.items.map((it, ii) => (
            <FoodRow
              key={ii}
              item={it}
              onChange={(next) => setMeal(mi, m.items.map((x, k) => (k === ii ? next : x)))}
              onRemove={() => setMeal(mi, m.items.filter((_, k) => k !== ii))}
            />
          ))}
          <Button
            title={`Add food to ${m.label.toLowerCase()}`}
            variant="dashed"
            icon="plus"
            height={44}
            onPress={() => setMeal(mi, [...m.items, { name: '', qty: '', calories: '', protein: '', carbs: '', fat: '' }])}
          />
        </View>
      ))}

      {hasFoods ? (
        <View style={st.totalBar}>
          <Txt style={st.totalText}>Foods total: {macroLine(foodTotals)}</Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Custom diet → API payload + calorie goals. */
export function customDietPayload(d) {
  const meals = d.meals
    .map((m) => ({
      key: m.key,
      label: m.label,
      items: m.items
        .filter((i) => String(i.name || '').trim())
        .map((i) => ({
          name: String(i.name).trim(),
          qty: String(i.qty || '').trim() || undefined,
          calories: Number(i.calories) || 0,
          protein: Number(i.protein) || 0,
          carbs: Number(i.carbs) || 0,
          fat: Number(i.fat) || 0,
        })),
    }))
    .filter((m) => m.items.length);
  const t = d.targets;
  return {
    title: String(d.name || '').trim() || 'My diet',
    description: `Custom · ${fmt(Number(t.calories) || 0)} kcal · ${Number(t.protein) || 0} g protein`,
    meals,
    calorieGoals: {
      dailyCalories: Math.round(Number(t.calories) || 0),
      protein: Math.round(Number(t.protein) || 0),
      carbs: Math.round(Number(t.carbs) || 0),
      fat: Math.round(Number(t.fat) || 0),
    },
  };
}

/* ------------------------------------------------------------ workouts */

export function ProgramChoiceList({ programs, value, onChange, filter, onFilter }) {
  const [open, setOpen] = useState(null);
  const shown = programs.filter((p) => matchesFilter(p, filter));
  return (
    <View style={{ gap: 12 }}>
      <Chips options={PROGRAM_FILTERS} value={filter} onChange={onFilter} />
      <View style={{ gap: 10 }}>
        {shown.map((p) => (
          <ChoiceCard
            key={p.id}
            on={value === p.id}
            onPress={() => onChange(p.id)}
            title={p.name}
            subtitle={p.blurb}
            meta={programMeta(p)}
            badge={p.id === programs[0]?.id ? 'Best match' : null}
            expanded={open === p.id}
            onToggle={() => setOpen(open === p.id ? null : p.id)}
            toggleLabel="See exercises"
          >
            <ProgramDays days={p.days} />
          </ChoiceCard>
        ))}
        {!shown.length ? <Txt style={st.hint}>Nothing here yet — try another filter.</Txt> : null}
      </View>
    </View>
  );
}

export const repsText = (e) => (e.unit === 'min' ? `${e.reps} min` : e.unit === 's' ? `${e.reps} s` : `${e.reps}`);

export function ProgramDays({ days }) {
  return (
    <View style={{ gap: 14 }}>
      {days.map((d) => (
        <View key={d.name} style={{ gap: 6 }}>
          <Txt style={st.mealTitle}>{d.name}</Txt>
          {d.exercises.map((e, i) => (
            <View key={`${e.exerciseId}-${i}`} style={st.food}>
              <Txt style={st.foodName} numberOfLines={1}>
                {cap(e.name)}
              </Txt>
              <Txt style={st.foodKcal}>
                {e.sets} × {repsText(e)}
              </Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  choice: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: colors.ink },
  choiceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  choiceTitle: { fontSize: 16, fontWeight: '600' },
  choiceSub: { fontSize: 13, color: colors.label2, lineHeight: 18 },
  choiceMeta: { fontSize: 12, fontWeight: '600', color: colors.label, marginTop: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 14, alignSelf: 'flex-start' },
  toggleText: { fontSize: 13, fontWeight: '600', color: colors.label2 },
  expand: { borderTopWidth: 1, borderTopColor: colors.sep, padding: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },

  chips: { gap: 8, paddingRight: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surface, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.label2 },

  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  mealKcal: { fontSize: 13, color: colors.label2 },
  food: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foodName: { flex: 1, fontSize: 14, color: colors.label, lineHeight: 19 },
  foodQty: { fontSize: 13, color: colors.label2 },
  foodKcal: { fontSize: 13, color: colors.label2 },

  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '600', paddingHorizontal: 4 },
  numBox: { flex: 1, backgroundColor: colors.surface2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  numLabel: { fontSize: 11, color: colors.label2 },
  numRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  numInput: { flex: 1, padding: 0, fontSize: 17, fontWeight: '600', color: colors.label, fontFamily: FONT_FAMILY, minWidth: 0 },
  numUnit: { fontSize: 12, color: colors.label2 },
  textInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.label,
    fontFamily: FONT_FAMILY,
  },
  foodEdit: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.sep },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hint: { fontSize: 13, color: colors.label2, lineHeight: 18, paddingHorizontal: 4, flexShrink: 1 },
  link: { fontSize: 13, fontWeight: '600', color: colors.label, textDecorationLine: 'underline' },
  totalBar: { backgroundColor: colors.lime, borderRadius: 14, padding: 12 },
  totalText: { fontSize: 13, fontWeight: '600', color: colors.onLime },
});
