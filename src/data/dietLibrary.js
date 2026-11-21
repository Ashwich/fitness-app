/**
 * Suggested day-of-eating plans. Each food has macros for one serving;
 * plans are scaled so the day lands on the person's calorie target.
 * Plan shape (also used for trainer and custom plans):
 *   meals: [{ key, label, items: [{ name, qty, calories, protein, carbs, fat }] }]
 */

// [name, per-serving amount, unit, kcal, protein, carbs, fat]
const F = {
  oats: ['Oats', 40, 'g', 150, 5, 27, 3],
  milk: ['Toned milk', 250, 'ml', 145, 8, 12, 7],
  banana: ['Banana', 1, '', 105, 1.3, 27, 0.4],
  apple: ['Apple', 1, '', 95, 0.5, 25, 0.3],
  paneer: ['Paneer', 100, 'g', 265, 18, 3.5, 20],
  tofu: ['Tofu', 100, 'g', 145, 15, 3, 8],
  soya: ['Soya chunks (dry)', 50, 'g', 172, 26, 17, 0.5],
  curd: ['Curd', 200, 'g', 120, 7, 9, 6],
  hungCurd: ['Hung curd', 150, 'g', 120, 15, 6, 4],
  roti: ['Roti', 1, '', 110, 3, 22, 1],
  dal: ['Dal', 1, 'bowl', 150, 9, 22, 3],
  rajma: ['Rajma', 1, 'bowl', 210, 12, 35, 2],
  chole: ['Chole', 1, 'bowl', 230, 11, 34, 6],
  rice: ['Rice (cooked)', 150, 'g', 195, 4, 43, 0.4],
  brownRice: ['Brown rice (cooked)', 150, 'g', 165, 4, 34, 1.3],
  sabzi: ['Mixed sabzi', 1, 'bowl', 120, 3, 14, 6],
  salad: ['Salad', 1, 'bowl', 50, 2, 9, 0.5],
  poha: ['Poha', 1, 'plate', 250, 5, 45, 6],
  upma: ['Upma', 1, 'plate', 230, 6, 35, 7],
  idli: ['Idli', 2, '', 130, 4, 28, 0.5],
  dosa: ['Plain dosa', 1, '', 170, 4, 29, 4],
  sambar: ['Sambar', 1, 'bowl', 130, 6, 18, 3],
  chilla: ['Besan chilla', 2, '', 240, 12, 30, 8],
  sprouts: ['Sprouts salad', 1, 'bowl', 100, 7, 17, 1],
  roastedChana: ['Roasted chana', 30, 'g', 110, 6, 18, 2],
  almonds: ['Almonds', 20, 'g', 115, 4, 4, 10],
  peanutButter: ['Peanut butter', 1, 'tbsp', 95, 4, 3, 8],
  brownBread: ['Brown bread', 2, 'slices', 140, 6, 24, 2],
  khichdi: ['Moong dal khichdi', 1, 'bowl', 250, 9, 42, 5],
  buttermilk: ['Buttermilk', 1, 'glass', 40, 2, 5, 1],
  whey: ['Whey protein', 1, 'scoop', 120, 24, 3, 1.5],
  egg: ['Boiled eggs', 2, '', 144, 12, 1, 10],
  eggWhites: ['Egg whites', 4, '', 68, 14, 1, 0.2],
  omelette: ['Omelette (2 eggs, veggies)', 1, '', 190, 13, 4, 14],
  bhurji: ['Egg bhurji (3 eggs)', 1, 'plate', 260, 18, 4, 19],
  eggCurry: ['Egg curry (2 eggs)', 1, 'bowl', 240, 14, 8, 17],
  chicken: ['Grilled chicken breast', 150, 'g', 250, 46, 0, 5],
  chickenCurry: ['Chicken curry', 1, 'bowl', 280, 25, 8, 16],
  fish: ['Grilled fish', 150, 'g', 190, 30, 0, 7],
  fishCurry: ['Fish curry', 1, 'bowl', 220, 24, 6, 11],
};

const MEAL_DEFS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'brunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

/** plan rows: [breakfast, lunch, snack, dinner] each a list of [foodKey, servings]. */
const PLANS = [
  {
    id: 'veg_classic',
    name: 'Classic Indian veg',
    blurb: 'Roti, dal and sabzi — simple home food.',
    types: ['VEG', 'EGG', 'NON_VEG'],
    goals: ['maintenance', 'weight_loss'],
    meals: [
      [['poha', 1], ['milk', 1]],
      [['roti', 2], ['dal', 1], ['sabzi', 1], ['salad', 1]],
      [['roastedChana', 1], ['apple', 1]],
      [['roti', 2], ['paneer', 0.5], ['sabzi', 1]],
    ],
  },
  {
    id: 'veg_protein',
    name: 'High-protein veg',
    blurb: 'Paneer, soya and curd to hit your protein.',
    types: ['VEG', 'EGG', 'NON_VEG'],
    goals: ['muscle_gain', 'weight_gain'],
    meals: [
      [['chilla', 1], ['hungCurd', 1]],
      [['roti', 2], ['rajma', 1], ['soya', 0.5], ['salad', 1]],
      [['whey', 1], ['banana', 1], ['almonds', 1]],
      [['roti', 2], ['paneer', 1], ['sabzi', 1]],
    ],
  },
  {
    id: 'veg_south',
    name: 'South Indian',
    blurb: 'Idli, dosa, sambar and curd rice.',
    types: ['VEG', 'EGG', 'NON_VEG'],
    goals: ['maintenance', 'weight_loss'],
    meals: [
      [['idli', 1.5], ['sambar', 1]],
      [['rice', 1], ['sambar', 1], ['sabzi', 1], ['curd', 1]],
      [['sprouts', 1], ['buttermilk', 1]],
      [['dosa', 2], ['tofu', 1], ['salad', 1]],
    ],
  },
  {
    id: 'veg_lean',
    name: 'Light & lean',
    blurb: 'Lower carbs, lots of fibre to stay full.',
    types: ['VEG', 'EGG', 'NON_VEG'],
    goals: ['weight_loss'],
    meals: [
      [['oats', 1], ['milk', 1], ['apple', 1]],
      [['brownRice', 1], ['dal', 1], ['salad', 1], ['buttermilk', 1]],
      [['sprouts', 1]],
      [['khichdi', 1], ['hungCurd', 1], ['salad', 1]],
    ],
  },
  {
    id: 'egg_balanced',
    name: 'Egg & veg balanced',
    blurb: 'Eggs at breakfast, home food the rest of the day.',
    types: ['EGG', 'NON_VEG'],
    goals: ['maintenance', 'weight_loss', 'muscle_gain'],
    meals: [
      [['omelette', 1], ['brownBread', 1]],
      [['roti', 2], ['dal', 1], ['sabzi', 1], ['curd', 1]],
      [['egg', 1], ['apple', 1]],
      [['rice', 1], ['eggCurry', 1], ['salad', 1]],
    ],
  },
  {
    id: 'egg_protein',
    name: 'Eggs high protein',
    blurb: 'Egg whites, bhurji and whey for muscle gain.',
    types: ['EGG', 'NON_VEG'],
    goals: ['muscle_gain', 'weight_gain'],
    meals: [
      [['oats', 1.5], ['milk', 1], ['eggWhites', 1], ['banana', 1]],
      [['rice', 1.5], ['dal', 1], ['egg', 1], ['salad', 1]],
      [['whey', 1], ['peanutButter', 1], ['brownBread', 1]],
      [['roti', 3], ['bhurji', 1], ['sabzi', 1]],
    ],
  },
  {
    id: 'nonveg_chicken',
    name: 'Chicken & rice',
    blurb: 'Lean chicken and rice — the classic gym diet.',
    types: ['NON_VEG'],
    goals: ['muscle_gain', 'weight_gain', 'maintenance'],
    meals: [
      [['omelette', 1], ['brownBread', 1], ['banana', 1]],
      [['rice', 1.5], ['chicken', 1], ['salad', 1]],
      [['hungCurd', 1], ['almonds', 1]],
      [['roti', 2], ['chickenCurry', 1], ['sabzi', 1]],
    ],
  },
  {
    id: 'nonveg_lean',
    name: 'Lean non-veg',
    blurb: 'Fish and chicken with lighter carbs for fat loss.',
    types: ['NON_VEG'],
    goals: ['weight_loss', 'maintenance'],
    meals: [
      [['eggWhites', 1], ['oats', 1], ['apple', 1]],
      [['brownRice', 1], ['fish', 1], ['salad', 1]],
      [['buttermilk', 1], ['roastedChana', 1]],
      [['roti', 2], ['chicken', 0.75], ['sabzi', 1]],
    ],
  },
  {
    id: 'nonveg_mixed',
    name: 'Mixed non-veg',
    blurb: 'Eggs, fish curry and chicken through the week.',
    types: ['NON_VEG'],
    goals: ['maintenance', 'muscle_gain', 'weight_gain'],
    meals: [
      [['bhurji', 1], ['roti', 2]],
      [['rice', 1], ['fishCurry', 1], ['salad', 1]],
      [['whey', 1], ['banana', 1]],
      [['roti', 2], ['chickenCurry', 1], ['curd', 1]],
    ],
  },
];

const r1 = (n) => Math.round(n * 10) / 10;

const qtyText = (food, servings) => {
  const [, per, unit] = food;
  const amount = per * servings;
  if (unit === 'g' || unit === 'ml') return `${Math.round(amount / 5) * 5} ${unit}`;
  const n = Number.isInteger(amount) ? amount : r1(amount);
  return unit ? `${n} ${unit}` : `${n}`;
};

const item = (key, servings) => {
  const f = F[key];
  return {
    name: f[0],
    qty: qtyText(f, servings),
    calories: Math.round(f[3] * servings),
    protein: r1(f[4] * servings),
    carbs: r1(f[5] * servings),
    fat: r1(f[6] * servings),
  };
};

/** Totals for any plan whose items carry macros. */
export function planTotals(meals) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  (Array.isArray(meals) ? meals : []).forEach((m) =>
    (m.items || []).forEach((i) => {
      t.calories += Number(i.calories) || 0;
      t.protein += Number(i.protein) || 0;
      t.carbs += Number(i.carbs) || 0;
      t.fat += Number(i.fat) || 0;
    }),
  );
  return { calories: Math.round(t.calories), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) };
}

const isWeighed = (f) => f[2] === 'g' || f[2] === 'ml';
/** Count foods round to whole pieces (half bowls/plates), never below one piece. */
const roundServing = (f, s) => {
  const step = f[1] > 1 ? 1 / f[1] : f[2] ? 0.5 : 1;
  return Math.max(step, Math.round(s / step) * step);
};

function buildPlan(def, targetKcal) {
  const kcalOf = (rows) => rows.reduce((t, [k, s]) => t + F[k][3] * s, 0);
  const all = def.meals.flat();
  const factor = targetKcal ? Math.min(2.5, Math.max(0.6, targetKcal / kcalOf(all))) : 1;
  // Pass 1: scale everything, rounding count foods to sensible pieces.
  let rows = def.meals.map((meal) =>
    meal.map(([k, s]) => [k, isWeighed(F[k]) ? s * factor : roundServing(F[k], s * factor)]),
  );
  // Pass 2: weighed foods (rice, oats, chicken…) absorb the rounding error.
  if (targetKcal) {
    const flat = rows.flat();
    const counted = kcalOf(flat.filter(([k]) => !isWeighed(F[k])));
    const weighed = kcalOf(flat.filter(([k]) => isWeighed(F[k])));
    if (weighed > 0) {
      const f2 = Math.min(2, Math.max(0.5, (targetKcal - counted) / weighed));
      rows = rows.map((meal) => meal.map(([k, s]) => [k, isWeighed(F[k]) ? s * f2 : s]));
    }
  }
  const meals = MEAL_DEFS.map((m, i) => ({
    key: m.key,
    label: m.label,
    items: rows[i].map(([k, s]) => item(k, s)),
  }));
  return {
    id: def.id,
    name: def.name,
    blurb: def.blurb,
    meals,
    totals: planTotals(meals),
  };
}

/** Plans for this diet type, best fit for the goal first, scaled to the calorie target. */
export function suggestDiets({ dietType = 'VEG', primaryGoal, calories } = {}) {
  const type = String(dietType || 'VEG').toUpperCase();
  return PLANS.filter((p) => p.types.includes(type))
    .map((p, i) => {
      let score = p.goals.includes(primaryGoal) ? 10 - p.goals.indexOf(primaryGoal) : 0;
      if (p.types[0] === type) score += 2; // prefer plans written for this diet type
      return { p, score, i };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ p }) => buildPlan(p, calories));
}

export const MEAL_SLOTS = MEAL_DEFS;

/** Map any meal label (trainer plans use free text) to a diary meal key. */
export function mealKeyFor(meal, index = 0) {
  if (meal?.key && MEAL_DEFS.some((m) => m.key === meal.key)) return meal.key;
  const l = String(meal?.label || meal?.name || '').toLowerCase();
  if (l.includes('break')) return 'breakfast';
  if (l.includes('lunch') || l.includes('brunch')) return 'brunch';
  if (l.includes('snack') || l.includes('evening') || l.includes('pre') || l.includes('post')) return 'snacks';
  if (l.includes('dinner') || l.includes('night')) return 'dinner';
  return MEAL_DEFS[Math.min(index, 3)].key;
}

/** Normalise stored plan meals (trainer/template/custom) to { key, label, items[] }. */
export function normalizeMeals(meals) {
  if (!Array.isArray(meals)) return [];
  return meals
    .map((m, i) => ({
      key: mealKeyFor(m, i),
      label: m?.label || m?.name || MEAL_DEFS[Math.min(i, 3)].label,
      items: (Array.isArray(m?.items) ? m.items : Array.isArray(m?.foods) ? m.foods : []).map((it) =>
        typeof it === 'string' ? { name: it } : { ...it, name: it?.name || it?.foodName || 'Food' },
      ),
    }))
    .filter((m) => m.items.length);
}

/** Diary food item for one plan item. */
export const toDiaryItem = (it) => ({
  foodId: `plan-${String(it.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  foodName: it.qty ? `${it.name} (${it.qty})` : it.name,
  amount: 1,
  calories: Number(it.calories) || 0,
  protein: Number(it.protein) || 0,
  carbs: Number(it.carbs) || 0,
  fat: Number(it.fat) || 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
});
