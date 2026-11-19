import { computeAutoGoals } from '../../utils/autoGoals';
import {
  ageFromDob,
  goalTypeFor,
  primaryGoalOf,
  sessionMinutesOf,
} from '../../utils/profileTargets';
import { toLocalISODate } from '../../utils/date';
import { bmiCategory, calculateBmi } from '../../utils/autoGoals';

const validDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Profile (server shape) → editable form state, with sensible defaults. */
export function profileToSetup(profile = {}) {
  const p = profile || {};
  return {
    about: {
      fullName: p.fullName || '',
      dateOfBirth: validDate(p.dateOfBirth),
      gender: p.gender ? String(p.gender).toLowerCase() : null,
      location: p.location || '',
    },
    body: {
      heightCm: Math.round(Number(p.heightCm)) || 170,
      weightKg: Math.round(Number(p.weightKg)) || 70,
    },
    plan: {
      primaryGoal: primaryGoalOf(p) || 'muscle_gain',
      activityLevel: p.activityLevel || 'moderately_active',
      workoutsPerWeek: Number(p.workoutsPerWeek) || 3,
      sessionMinutes: sessionMinutesOf(p) || 45,
    },
    dietType: p.dietType || 'VEG',
  };
}

export const aboutPayload = (a) => {
  const dob = a.dateOfBirth ? toLocalISODate(a.dateOfBirth) : undefined;
  return {
    fullName: a.fullName?.trim() || undefined,
    dateOfBirth: dob,
    age: dob ? ageFromDob(dob) ?? undefined : undefined,
    gender: a.gender || undefined,
    location: a.location?.trim() || undefined,
  };
};

export const bodyPayload = (b) => {
  const bmi = calculateBmi(b.weightKg, b.heightCm);
  return {
    heightCm: b.heightCm,
    weightKg: b.weightKg,
    bmi: bmi ? Math.round(bmi * 10) / 10 : undefined,
    bmiCategory: bmiCategory(bmi) || undefined,
  };
};

export const planPayload = (p) => ({
  fitnessGoals: { primaryGoal: p.primaryGoal },
  activityLevel: p.activityLevel,
  workoutsPerWeek: p.workoutsPerWeek,
  timePerWorkout: `${p.sessionMinutes} min`,
  goalType: goalTypeFor(p.primaryGoal),
});

/** Calories, macros, steps and water from the three forms. */
export function goalsFor(state) {
  const age = ageFromDob(state.about.dateOfBirth);
  return computeAutoGoals({
    personalInfo: { age: age || 30, gender: state.about.gender || 'male' },
    physicalInfo: { weightKg: state.body.weightKg, heightCm: state.body.heightCm },
    fitnessGoals: { exerciseLevel: state.plan.activityLevel, primaryGoal: state.plan.primaryGoal },
  });
}

/** Calorie + macro targets in the shape the app reads ({ dailyCalories, … }). */
export const calorieGoalsPayload = (goals) => {
  const c = goals?.calorieGoals;
  if (!c) return undefined;
  return {
    dailyCalories: c.dailyCalories,
    protein: c.protein,
    carbs: c.carbs,
    fat: c.fat,
  };
};
