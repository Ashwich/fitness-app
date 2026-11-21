import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveWorkout, saveCustomWorkout } from '../../api/services/workoutService';
import { enrichWorkoutDays, STARTER_PLAN_DAYS } from '../../data/exercises';

const NEXT_DAY_KEY = 'fitsera_next_workout_day';
const PENDING_STARTER_KEY = 'fitsera_pending_starter_workout';
const PENDING_NAME_KEY = 'fitsera_pending_starter_name';

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Active plan from the server (trainer / auto), else the local Push/Pull/Legs starter. */
export async function loadPlan() {
  try {
    const result = await getActiveWorkout();
    const days = enrichWorkoutDays(Array.isArray(result?.plan?.days) ? clone(result.plan.days) : []);
    if (result?.plan && days.length) {
      return { plan: result.plan, days, source: result.source || result.plan.source || null };
    }
  } catch {
    /* fall through to starter */
  }
  let starter = STARTER_PLAN_DAYS;
  let name = 'Push · Pull · Legs';
  try {
    const pending = await AsyncStorage.getItem(PENDING_STARTER_KEY);
    if (pending) starter = JSON.parse(pending);
    name = (await AsyncStorage.getItem(PENDING_NAME_KEY)) || name;
  } catch {
    /* ignore */
  }
  return {
    plan: { id: null, name, source: 'STARTER' },
    days: enrichWorkoutDays(clone(starter)),
    source: 'STARTER',
  };
}

/**
 * Make a program the active plan. Saved to the account; if the server can't be
 * reached it is kept on the phone so the Train tab still shows it.
 */
export async function applyProgram({ id, name, days }) {
  const payload = { name, days, programId: id };
  let saved = true;
  try {
    await saveCustomWorkout(payload);
    await AsyncStorage.multiRemove([PENDING_STARTER_KEY, PENDING_NAME_KEY]);
  } catch {
    saved = false;
    await AsyncStorage.multiSet([
      [PENDING_STARTER_KEY, JSON.stringify(days)],
      [PENDING_NAME_KEY, name],
    ]).catch(() => {});
  }
  await AsyncStorage.setItem(NEXT_DAY_KEY, '0').catch(() => {});
  return saved;
}

export async function getNextDayIndex(count) {
  try {
    const v = parseInt((await AsyncStorage.getItem(NEXT_DAY_KEY)) || '0', 10);
    return count ? ((v % count) + count) % count : 0;
  } catch {
    return 0;
  }
}

export async function advanceDay(fromIndex, count) {
  try {
    await AsyncStorage.setItem(NEXT_DAY_KEY, String(count ? (fromIndex + 1) % count : 0));
  } catch {
    /* ignore */
  }
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Push day" → tab label "Push". */
export const dayTab = (day, i) => {
  const n = String(day?.name || day?.title || `Day ${i + 1}`).replace(/\s*day$/i, '').trim();
  return cap(n) || `Day ${i + 1}`;
};

export const dayTitle = (day, i) => {
  const n = String(day?.name || day?.title || `Day ${i + 1}`).trim();
  return /day$/i.test(n) ? cap(n.replace(/Day$/, 'day')) : n;
};

export const estimateMinutes = (day) => {
  const sets = (day?.exercises || []).reduce((t, e) => t + (Number(e.sets) || 3), 0);
  return Math.max(15, Math.round((sets * 2.5 + 5) / 5) * 5);
};

/** "Chest, shoulders, triceps · about 55 min" */
export function daySubtitle(day) {
  const parts = [];
  (day?.exercises || []).forEach((e) => {
    const t = (e.target || e.bodyPart || '').toLowerCase();
    if (t && !parts.includes(t) && parts.length < 3) parts.push(t);
  });
  const muscles = parts.length ? cap(parts.join(', ')) : `${(day?.exercises || []).length} exercises`;
  return `${muscles} · about ${estimateMinutes(day)} min`;
}

/** For the Today screen row. */
export async function nextWorkoutSummary() {
  const { days } = await loadPlan();
  if (!days.length) return null;
  const i = await getNextDayIndex(days.length);
  const day = days[i];
  return {
    title: dayTitle(day, i),
    subtitle: `${(day.exercises || []).length} exercises · about ${estimateMinutes(day)} min`,
  };
}
