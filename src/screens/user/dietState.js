import { saveCustomDiet } from '../../api/services/dietService';
import { addFoodToMeal } from '../../api/services/diaryService';
import { upsertProfile } from '../../api/services/profileService';
import { toDiaryItem } from '../../data/dietLibrary';
import { toLocalISODate } from '../../utils/date';

/** Make a suggested plan the active diet (one tap). */
export const applySuggestedDiet = (plan) =>
  saveCustomDiet({ title: plan.name, description: plan.blurb, meals: plan.meals });

/** Save a self-built diet and make its macros the daily targets. */
export async function applyCustomDiet(payload) {
  await saveCustomDiet({ title: payload.title, description: payload.description, meals: payload.meals });
  await upsertProfile({ calorieGoals: payload.calorieGoals });
}

/** Every item has calories, so the meal can be logged in one tap. */
export const canQuickLog = (meal) =>
  (meal?.items || []).length > 0 && meal.items.every((i) => Number(i.calories) > 0);

/** Log every food in a plan meal to today's diary. */
export async function logMealToday(meal) {
  const date = toLocalISODate();
  for (const it of meal.items) {
    // Sequential so the server's read-modify-write on the diary row doesn't race.
    // eslint-disable-next-line no-await-in-loop
    await addFoodToMeal(meal.key, toDiaryItem(it), date);
  }
}
