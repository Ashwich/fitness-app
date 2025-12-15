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
    const value = profile[field.key];
    if (field.nested && value && value[field.nested]) {
      completedFields.push(field);
    } else if (!field.nested && value !== null && value !== undefined && value !== '') {
      completedFields.push(field);
    } else {
      missingCategories.add(field.category);
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

