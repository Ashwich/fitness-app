/**
 * Built-in training programs. Exercise ids point at the catalogue in
 * exercises-data.js (names, media and instructions come from there).
 * `reps` on cardio/stretch moves is seconds (or minutes where noted in `unit`).
 */
import { getExerciseById, STARTER_PLAN_DAYS } from './exercises';

const ex = (id, sets, reps, unit) => ({ id, sets, reps, unit });

const PROGRAMS_RAW = [
  {
    id: 'ppl',
    name: 'Push · Pull · Legs',
    blurb: 'Classic gym split for building muscle and strength.',
    where: 'gym',
    focus: 'muscle',
    level: 'Intermediate',
    goals: ['muscle_gain', 'weight_gain', 'maintenance'],
    days: STARTER_PLAN_DAYS.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => ex(e.exerciseId, e.sets, e.reps)),
    })),
  },
  {
    id: 'full_body',
    name: 'Full body',
    blurb: 'Three whole-body sessions a week. Best place to start.',
    where: 'gym',
    focus: 'general',
    level: 'Beginner',
    goals: ['weight_loss', 'maintenance', 'muscle_gain', 'weight_gain'],
    days: [
      { name: 'Full body A', exercises: [ex('0043', 3, 8), ex('0025', 3, 8), ex('0027', 3, 8), ex('0405', 3, 10), ex('0274', 3, 15)] },
      { name: 'Full body B', exercises: [ex('0032', 3, 5), ex('0314', 3, 10), ex('2330', 3, 10), ex('0336', 3, 10), ex('0472', 3, 10)] },
      { name: 'Full body C', exercises: [ex('1760', 3, 12), ex('0289', 3, 10), ex('0293', 3, 10), ex('0334', 3, 12), ex('0294', 3, 12), ex('0201', 3, 12)] },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper · Lower',
    blurb: 'Four days, each muscle trained twice a week.',
    where: 'gym',
    focus: 'muscle',
    level: 'Intermediate',
    goals: ['muscle_gain', 'weight_gain', 'maintenance'],
    days: [
      { name: 'Upper A', exercises: [ex('0025', 4, 6), ex('0027', 4, 8), ex('0405', 3, 10), ex('2330', 3, 10), ex('0031', 3, 10), ex('0201', 3, 12)] },
      { name: 'Lower A', exercises: [ex('0043', 4, 6), ex('0085', 3, 8), ex('0585', 3, 12), ex('0586', 3, 12), ex('0594', 4, 15)] },
      { name: 'Upper B', exercises: [ex('0314', 4, 8), ex('0861', 4, 10), ex('2137', 3, 10), ex('0652', 3, 8), ex('0313', 3, 12), ex('0060', 3, 10)] },
      { name: 'Lower B', exercises: [ex('0032', 3, 5), ex('1760', 3, 12), ex('1460', 3, 12), ex('0597', 3, 15), ex('1373', 4, 15)] },
    ],
  },
  {
    id: 'bro_split',
    name: 'Body-part split',
    blurb: 'Five days: chest, back, shoulders, legs and arms.',
    where: 'gym',
    focus: 'muscle',
    level: 'Advanced',
    goals: ['muscle_gain', 'weight_gain'],
    days: [
      { name: 'Chest', exercises: [ex('0025', 4, 8), ex('0047', 3, 10), ex('0308', 3, 12), ex('0251', 3, 10), ex('0155', 3, 12)] },
      { name: 'Back', exercises: [ex('0032', 3, 5), ex('0652', 3, 8), ex('0027', 4, 8), ex('0861', 3, 10), ex('0095', 3, 12)] },
      { name: 'Shoulders', exercises: [ex('0091', 4, 8), ex('0334', 4, 12), ex('0378', 3, 12), ex('0120', 3, 10), ex('2137', 3, 10)] },
      { name: 'Legs', exercises: [ex('0043', 4, 8), ex('0085', 3, 10), ex('0585', 3, 12), ex('0586', 3, 12), ex('0594', 4, 15)] },
      { name: 'Arms', exercises: [ex('0031', 3, 10), ex('0070', 3, 10), ex('0313', 3, 12), ex('0030', 3, 8), ex('0201', 3, 12), ex('0060', 3, 10)] },
    ],
  },
  {
    id: 'strength_5x5',
    name: 'Strength 5×5',
    blurb: 'Two alternating days of heavy compound lifts.',
    where: 'gym',
    focus: 'strength',
    level: 'Intermediate',
    goals: ['muscle_gain', 'weight_gain', 'maintenance'],
    days: [
      { name: 'Workout A', exercises: [ex('0043', 5, 5), ex('0025', 5, 5), ex('0027', 5, 5)] },
      { name: 'Workout B', exercises: [ex('0043', 5, 5), ex('0091', 5, 5), ex('0032', 1, 5)] },
    ],
  },
  {
    id: 'fat_loss',
    name: 'Fat-loss circuits',
    blurb: 'Fast circuits plus cardio to burn more calories.',
    where: 'gym',
    focus: 'fat_loss',
    level: 'Beginner',
    goals: ['weight_loss', 'maintenance'],
    days: [
      { name: 'Circuit A', exercises: [ex('0549', 4, 15), ex('1760', 3, 15), ex('0662', 3, 12), ex('0293', 3, 12), ex('0630', 3, 30, 's'), ex('2138', 1, 15, 'min')] },
      { name: 'Circuit B', exercises: [ex('1160', 4, 10), ex('0336', 3, 12), ex('0426', 3, 12), ex('2612', 4, 60, 's'), ex('0003', 3, 20)] },
      { name: 'Cardio + core', exercises: [ex('0685', 1, 20, 'min'), ex('3361', 3, 20), ex('0514', 3, 15), ex('0687', 3, 20), ex('0459', 3, 30, 's')] },
    ],
  },
  {
    id: 'home_bodyweight',
    name: 'Home · no equipment',
    blurb: 'Bodyweight only. Train anywhere in about 30 minutes.',
    where: 'home',
    focus: 'general',
    level: 'Beginner',
    goals: ['weight_loss', 'maintenance', 'muscle_gain'],
    days: [
      { name: 'Home A', exercises: [ex('0662', 3, 12), ex('0514', 3, 12), ex('1460', 3, 12), ex('0814', 3, 12), ex('0630', 3, 30, 's'), ex('0274', 3, 20)] },
      { name: 'Home B', exercises: [ex('0493', 3, 12), ex('0499', 3, 10), ex('3561', 3, 12), ex('1373', 3, 20), ex('0276', 3, 12), ex('0459', 3, 30, 's')] },
      { name: 'Home C', exercises: [ex('1160', 3, 10), ex('0283', 3, 10), ex('1688', 3, 12), ex('3223', 3, 20), ex('0687', 3, 20), ex('0464', 3, 12)] },
    ],
  },
  {
    id: 'home_dumbbell',
    name: 'Home · dumbbells',
    blurb: 'A pair of dumbbells is all you need.',
    where: 'home',
    focus: 'muscle',
    level: 'Beginner',
    goals: ['muscle_gain', 'weight_gain', 'maintenance', 'weight_loss'],
    days: [
      { name: 'Dumbbell A', exercises: [ex('0413', 3, 12), ex('0289', 3, 10), ex('0293', 3, 10), ex('0405', 3, 10), ex('0294', 3, 12)] },
      { name: 'Dumbbell B', exercises: [ex('1459', 3, 10), ex('0314', 3, 10), ex('0292', 3, 10), ex('0334', 3, 12), ex('0333', 3, 12)] },
      { name: 'Dumbbell C', exercises: [ex('0336', 3, 12), ex('0431', 3, 10), ex('0308', 3, 12), ex('2137', 3, 10), ex('0313', 3, 12)] },
    ],
  },
  {
    id: 'glutes_legs',
    name: 'Glutes & legs',
    blurb: 'Lower-body focus with one upper-body day.',
    where: 'gym',
    focus: 'toning',
    level: 'Beginner',
    goals: ['weight_loss', 'maintenance', 'muscle_gain'],
    days: [
      { name: 'Glutes', exercises: [ex('1409', 4, 10), ex('0043', 3, 8), ex('0434', 3, 10), ex('0597', 3, 15), ex('0860', 3, 12)] },
      { name: 'Upper body', exercises: [ex('0289', 3, 10), ex('2330', 3, 10), ex('0405', 3, 10), ex('0293', 3, 10), ex('0464', 3, 12)] },
      { name: 'Legs', exercises: [ex('1760', 4, 12), ex('0117', 3, 8), ex('0410', 3, 10), ex('0710', 3, 15), ex('1373', 3, 20)] },
    ],
  },
  {
    id: 'mobility_core',
    name: 'Mobility & core',
    blurb: 'Stretching and core work for posture and recovery.',
    where: 'home',
    focus: 'mobility',
    level: 'All levels',
    goals: ['maintenance', 'weight_loss'],
    days: [
      { name: 'Mobility A', exercises: [ex('1604', 2, 6), ex('1511', 2, 30, 's'), ex('1363', 2, 30, 's'), ex('1494', 2, 30, 's'), ex('0276', 3, 12), ex('3544', 3, 20, 's')] },
      { name: 'Mobility B', exercises: [ex('1585', 2, 30, 's'), ex('1424', 2, 30, 's'), ex('1564', 2, 30, 's'), ex('0690', 2, 30, 's'), ex('0274', 3, 15), ex('0620', 3, 12)] },
    ],
  },
];

export const PROGRAM_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'gym', label: 'Gym' },
  { value: 'home', label: 'Home' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'mobility', label: 'Mobility' },
];

/** Days in the plan shape the app and API use ({ name, exercises: [{ name, exerciseId, sets, reps }] }). */
const toDays = (days) =>
  days.map((d) => ({
    name: d.name,
    exercises: d.exercises.map((e) => {
      const c = getExerciseById(e.id);
      return { name: c?.n || e.id, exerciseId: e.id, sets: e.sets, reps: e.reps, ...(e.unit ? { unit: e.unit } : {}) };
    }),
  }));

export const PROGRAMS = PROGRAMS_RAW.map((p) => ({ ...p, days: toDays(p.days) }));

export const getProgram = (id) => PROGRAMS.find((p) => p.id === id) || null;

export const matchesFilter = (p, f) =>
  f === 'all' || p.where === f || p.focus === f || (f === 'muscle' && p.focus === 'strength') || (f === 'fat_loss' && p.focus === 'toning');

/**
 * Programs ranked for this person: goal match first, then how close the
 * number of training days is to how often they said they can train.
 */
export function rankPrograms({ primaryGoal, workoutsPerWeek } = {}) {
  const want = Number(workoutsPerWeek) || 3;
  return PROGRAMS.map((p, i) => {
    let score = 0;
    const gi = p.goals.indexOf(primaryGoal);
    if (gi === 0) score += 6;
    else if (gi > 0) score += 4 - Math.min(gi, 3);
    score -= Math.abs(p.days.length - want) * 1.5;
    if (want <= 3 && p.level === 'Advanced') score -= 2;
    return { p, score, i };
  })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p);
}

export const programMeta = (p) => `${p.days.length} days a week · ${p.where === 'home' ? 'Home' : 'Gym'} · ${p.level}`;
