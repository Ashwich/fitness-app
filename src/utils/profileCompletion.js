/**
 * Calculate profile completion percentage
 * @param {Object} profile - User profile object
 * @returns {Object} - { percentage: number, completed: number, total: number, missing: string[] }
 */
export const calculateProfileCompletion = (profile) => {
  if (!profile) {
    return {
      percentage: 0,
      completed: 0,
      total: 10,
      missing: [
        'Personal Information',
        'Physical Information',
        'Fitness Goals',
        'Nutrition Goals',
        'Profile Photo',
      ],
    };
  }

  const fields = [
    { key: 'fullName', label: 'Full Name', category: 'Personal Information' },
    { key: 'dateOfBirth', label: 'Date of Birth', category: 'Personal Information' },
    { key: 'gender', label: 'Gender', category: 'Personal Information' },
    { key: 'location', label: 'Location', category: 'Personal Information' },
    { key: 'weightKg', label: 'Weight', category: 'Physical Information' },
    { key: 'heightCm', label: 'Height', category: 'Physical Information' },
    { key: 'fitnessGoals', label: 'Fitness Goals', category: 'Fitness Goals', nested: 'primaryGoal' },
    { key: 'activityLevel', label: 'Activity Level', category: 'Fitness Goals' },
    { key: 'calorieGoals', label: 'Nutrition Goals', category: 'Nutrition Goals', nested: 'dailyCalories' },
  ];

  const completedFields = [];
  const missingCategories = new Set();

  fields.forEach((field) => {
    let value = profile[field.key];
    let isCompleted = false;

    if (value && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // keep as string
      }
    }

    if (field.nested) {
      if (value && typeof value === 'object') {
        const nestedValue = value[field.nested];
        if (field.nested === 'dailyCalories') {
          isCompleted =
            nestedValue !== null &&
            nestedValue !== undefined &&
            nestedValue !== '' &&
            !isNaN(nestedValue) &&
            nestedValue > 0;
        } else {
          isCompleted =
            nestedValue !== null && nestedValue !== undefined && nestedValue !== '';
        }
      }
    } else if (field.key === 'weightKg' || field.key === 'heightCm') {
      isCompleted =
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !isNaN(value) &&
        value > 0;
    } else {
      isCompleted = value !== null && value !== undefined && value !== '';
    }

    if (isCompleted) {
      completedFields.push(field);
    } else {
      missingCategories.add(field.category);
    }
  });

  const total = fields.length;
  const completed = completedFields.length;
  const percentage = Math.round((completed / total) * 100);

  return {
    percentage,
    completed,
    total,
    missing: Array.from(missingCategories),
  };
};
