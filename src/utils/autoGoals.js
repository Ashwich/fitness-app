/**
 * Derive nutrition, water, and step goals from personal + physical + fitness inputs.
 */

export function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function calculateBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age || !gender) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const g = String(gender).toLowerCase();
  return g === 'male' ? Math.round(base + 5) : Math.round(base - 161);
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function calculateTDEE(bmr, activityLevel) {
  if (!bmr) return null;
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2));
}

export function calculateMacros(tdee, primaryGoal) {
  if (!tdee) return null;
  let adjustment = 0;
  if (primaryGoal === 'weight_loss') adjustment = -500;
  else if (primaryGoal === 'weight_gain') adjustment = 500;
  else if (primaryGoal === 'muscle_gain') adjustment = 300;

  const dailyCalories = Math.max(1200, tdee + adjustment);
  return {
    dailyCalories,
    protein: Math.round((dailyCalories * 0.3) / 4),
    carbs: Math.round((dailyCalories * 0.4) / 4),
    fat: Math.round((dailyCalories * 0.3) / 9),
  };
}

/** Water goal in liters */
export function calculateWaterGoalLiters(weightKg, activityLevel, primaryGoal) {
  let liters = Math.max(2.0, (Number(weightKg) || 70) * 0.033);
  if (activityLevel === 'very_active' || activityLevel === 'extremely_active') {
    liters += 0.5;
  } else if (activityLevel === 'moderately_active') {
    liters += 0.3;
  }
  if (primaryGoal === 'muscle_gain') liters += 0.3;
  return Math.round(liters * 10) / 10;
}

export function calculateStepGoal(activityLevel, bmi, primaryGoal) {
  const base = {
    sedentary: 6000,
    lightly_active: 8000,
    moderately_active: 10000,
    very_active: 12000,
    extremely_active: 14000,
  };
  let steps = base[activityLevel] || 8000;
  if (bmi != null && bmi >= 25 && primaryGoal === 'weight_loss') {
    steps += 1000;
  }
  return steps;
}

/**
 * Full auto-goals bundle from onboarding params.
 */
export function computeAutoGoals({ personalInfo = {}, physicalInfo = {}, fitnessGoals = {} }) {
  const weightKg = Number(physicalInfo.weightKg || physicalInfo.weight);
  const heightCm = Number(physicalInfo.heightCm || physicalInfo.height);
  const age = Number(personalInfo.age);
  const gender = personalInfo.gender;
  const activityLevel = fitnessGoals.exerciseLevel || fitnessGoals.activityLevel;
  const primaryGoal = fitnessGoals.primaryGoal;

  const bmi =
    physicalInfo.bmi != null
      ? Number(physicalInfo.bmi)
      : calculateBmi(weightKg, heightCm);
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const calorieGoals = calculateMacros(tdee, primaryGoal);
  const waterGoalLiters = calculateWaterGoalLiters(weightKg, activityLevel, primaryGoal);
  const stepGoal = calculateStepGoal(activityLevel, bmi, primaryGoal);

  return {
    bmi: bmi != null ? Math.round(bmi * 10) / 10 : null,
    bmiCategory: bmiCategory(bmi),
    bmr,
    tdee,
    calorieGoals,
    waterGoalLiters,
    waterGoalMl: Math.round(waterGoalLiters * 1000),
    stepGoal,
  };
}
