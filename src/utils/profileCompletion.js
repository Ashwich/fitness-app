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
    
    // Handle JSON string values (from database)
    if (value && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Not JSON, keep as is
      }
    }
    
    if (field.nested) {
      // Check nested field (e.g., fitnessGoals.primaryGoal, calorieGoals.dailyCalories)
      if (value && typeof value === 'object') {
        const nestedValue = value[field.nested];
        // Check if nested value is not null, undefined, or empty string
        // For dailyCalories, 0 is not valid, but for other fields it might be
        if (field.nested === 'dailyCalories') {
          isCompleted = nestedValue !== null && nestedValue !== undefined && nestedValue !== '' && !isNaN(nestedValue) && nestedValue > 0;
        } else {
          isCompleted = nestedValue !== null && nestedValue !== undefined && nestedValue !== '';
        }
      }
    } else {
      // Check direct field
      // For numeric fields, 0 is not a valid value
      if (field.key === 'weightKg' || field.key === 'heightCm') {
        isCompleted = value !== null && value !== undefined && value !== '' && !isNaN(value) && value > 0;
      } else {
        isCompleted = value !== null && value !== undefined && value !== '';
      }
    }
    
    if (isCompleted) {
      completedFields.push(field);
    } else {
      missingCategories.add(field.category);
      console.log(`[ProfileCompletion] Missing field: ${field.key} (category: ${field.category})`);
      if (field.nested) {
        console.log(`[ProfileCompletion]   Value:`, value, `Nested key: ${field.nested}`, `Nested value:`, value?.[field.nested]);
      } else {
        console.log(`[ProfileCompletion]   Value:`, value);
      }
    }
  });

  const total = fields.length;
  const completed = completedFields.length;
  const percentage = Math.round((completed / total) * 100);
  const missing = Array.from(missingCategories);

  return {
    percentage,
    completed,
    total,
    missing,
  };
};

