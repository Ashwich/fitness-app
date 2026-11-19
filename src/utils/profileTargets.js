/**
 * Read a user profile (any of the shapes the backend has stored over time)
 * into the numbers and labels the redesigned screens show.
 */
import { bmiCategory, calculateBmi } from './autoGoals';

const parseJson = (v) => {
  if (v && typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v || null;
};

export const GOALS = [
  { value: 'weight_loss', label: 'Lose weight', short: 'Losing weight' },
  { value: 'weight_gain', label: 'Gain weight', short: 'Gaining weight' },
  { value: 'muscle_gain', label: 'Build muscle', short: 'Building muscle' },
  { value: 'maintenance', label: 'Maintain', short: 'Staying fit' },
];

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Mostly sitting', sub: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', sub: '1–3 days a week' },
  { value: 'moderately_active', label: 'Moderately active', sub: '3–5 days a week' },
  { value: 'very_active', label: 'Very active', sub: 'Hard exercise most days' },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const DIET_TYPES = [
  { value: 'VEG', label: 'Vegetarian' },
  { value: 'EGG', label: 'Eggetarian' },
  { value: 'NON_VEG', label: 'Non-veg' },
];

export const SESSION_LENGTHS = [30, 45, 60, 90];

/** Backend stores goalType as gain | loss | maintain for diet templates. */
export const goalTypeFor = (primaryGoal) =>
  primaryGoal === 'weight_loss'
    ? 'loss'
    : primaryGoal === 'weight_gain' || primaryGoal === 'muscle_gain'
      ? 'gain'
      : 'maintain';

export function primaryGoalOf(profile) {
  const fg = parseJson(profile?.fitnessGoals);
  return fg?.primaryGoal || fg?.primary || null;
}

export function goalLabel(primaryGoal, kind = 'label') {
  const g = GOALS.find((x) => x.value === primaryGoal);
  return g ? g[kind] : null;
}

export function calorieGoalsOf(profile) {
  const cg = parseJson(profile?.calorieGoals) || {};
  const kcal = Number(cg.dailyCalories || cg.calories) || 0;
  return {
    calories: kcal,
    protein: Number(cg.protein || cg.proteinG) || 0,
    carbs: Number(cg.carbs || cg.carbsG) || 0,
    fat: Number(cg.fat || cg.fatG) || 0,
  };
}

export function bmiOf(profile) {
  const w = Number(profile?.weightKg);
  const h = Number(profile?.heightCm);
  const raw = profile?.bmi ? Number(profile.bmi) : calculateBmi(w, h);
  if (!raw || Number.isNaN(raw)) return { bmi: null, category: null };
  return { bmi: Math.round(raw * 10) / 10, category: bmiCategory(raw) };
}

export function sessionMinutesOf(profile) {
  const m = parseInt(String(profile?.timePerWorkout || ''), 10);
  return Number.isFinite(m) && m > 0 ? m : null;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** True when a user still needs the setup flow (new account / skipped setup). */
export function needsOnboarding(profile) {
  if (!profile) return true;
  if (profile.onboardingCompleted) return false;
  const hasBody = Number(profile.weightKg) > 0 && Number(profile.heightCm) > 0;
  const hasGoal = Boolean(primaryGoalOf(profile) || profile.goalType);
  return !(hasBody && hasGoal);
}

/** 0..5 setup checklist for the "Finish setting up" card on Today. */
export function setupProgress(profile) {
  const checks = [
    Boolean(profile?.fullName && profile?.dateOfBirth && profile?.gender),
    Number(profile?.weightKg) > 0 && Number(profile?.heightCm) > 0,
    Boolean(primaryGoalOf(profile) && profile?.activityLevel),
    calorieGoalsOf(profile).calories > 0,
    Boolean(profile?.location),
  ];
  const done = checks.filter(Boolean).length;
  const nextIndex = checks.findIndex((c) => !c);
  return { done, total: checks.length, nextIndex };
}

export const firstName = (profile, user) => {
  const n = (profile?.fullName || user?.fullName || user?.name || '').trim();
  return n ? n.split(/\s+/)[0] : null;
};

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export const todayLabel = (d = new Date()) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** Single-letter weekday labels for the last 7 days ending today. */
export function lastSevenDayLetters() {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(letters[d.getDay()]);
  }
  return out;
}
