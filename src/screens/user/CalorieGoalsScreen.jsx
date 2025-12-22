import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const CalorieGoalsScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};
  const fitnessGoals = route.params?.fitnessGoals || {};

  // Get calorie goals from existingProfile or route params
  const existingCalorieGoals = existingProfile?.calorieGoals || {};
  
  const [calorieGoals, setCalorieGoals] = useState({
    dailyCalories: existingCalorieGoals?.dailyCalories?.toString() || '',
    protein: existingCalorieGoals?.protein?.toString() || '',
    carbs: existingCalorieGoals?.carbs?.toString() || '',
    fat: existingCalorieGoals?.fat?.toString() || '',
  });

  const [loading, setLoading] = useState(false);
  const [autoCalculated, setAutoCalculated] = useState(false);

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age || !gender) return null;

    // Convert to metric if needed
    let weightKg = weight;
    let heightCm = height;

    if (existingProfile?.weightUnit === 'lbs') {
      weightKg = weight * 0.453592;
    }
    if (existingProfile?.heightUnit === 'ft') {
      heightCm = height * 30.48;
    } else if (existingProfile?.heightUnit === 'in') {
      heightCm = height * 2.54;
    }

    // Mifflin-St Jeor Equation
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    if (gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    return Math.round(bmr);
  };

  // Calculate TDEE (Total Daily Energy Expenditure)
  const calculateTDEE = (bmr, activityLevel) => {
    if (!bmr || !activityLevel) return null;

    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };

    return Math.round(bmr * (multipliers[activityLevel] || 1.2));
  };

  // Calculate macros based on goal
  const calculateMacros = (tdee, goal) => {
    if (!tdee || !goal) return null;

    let calorieAdjustment = 0;
    if (goal === 'weight_loss') {
      calorieAdjustment = -500; // 500 calorie deficit
    } else if (goal === 'weight_gain') {
      calorieAdjustment = 500; // 500 calorie surplus
    } else if (goal === 'muscle_gain') {
      calorieAdjustment = 300; // 300 calorie surplus
    }

    const dailyCalories = Math.max(1200, tdee + calorieAdjustment);

    // Standard macro split: 30% protein, 40% carbs, 30% fat
    const protein = Math.round((dailyCalories * 0.3) / 4);
    const carbs = Math.round((dailyCalories * 0.4) / 4);
    const fat = Math.round((dailyCalories * 0.3) / 9);

    return { dailyCalories, protein, carbs, fat };
  };

  useEffect(() => {
    // Update calorie goals if they exist in route params or existing profile
    const calorieGoalsFromParams = route.params?.calorieGoals || existingProfile?.calorieGoals || {};
    if (calorieGoalsFromParams.dailyCalories && !calorieGoals.dailyCalories) {
      setCalorieGoals({
        dailyCalories: calorieGoalsFromParams.dailyCalories?.toString() || '',
        protein: calorieGoalsFromParams.protein?.toString() || '',
        carbs: calorieGoalsFromParams.carbs?.toString() || '',
        fat: calorieGoalsFromParams.fat?.toString() || '',
      });
    }
  }, [route.params?.calorieGoals, existingProfile?.calorieGoals]);

  useEffect(() => {
    // Auto-calculate when all required data is available (only if no existing goals)
    if (
      personalInfo &&
      physicalInfo &&
      fitnessGoals?.exerciseLevel &&
      fitnessGoals?.primaryGoal &&
      !calorieGoals.dailyCalories
    ) {
      handleAutoCalculate();
    }
  }, [personalInfo, physicalInfo, fitnessGoals]);

  const handleAutoCalculate = () => {
    // Use weightKg and heightCm from physicalInfo, fallback to weight/height for compatibility
    const weight = physicalInfo?.weightKg || physicalInfo?.weight;
    const height = physicalInfo?.heightCm || physicalInfo?.height;
    
    const bmr = calculateBMR(
      weight,
      height,
      personalInfo?.age,
      personalInfo?.gender
    );

    if (!bmr) {
      return;
    }

    const tdee = calculateTDEE(bmr, fitnessGoals?.exerciseLevel);
    if (!tdee) {
      return;
    }

    const macros = calculateMacros(tdee, fitnessGoals?.primaryGoal);

    if (macros) {
      setCalorieGoals({
        dailyCalories: macros.dailyCalories.toString(),
        protein: macros.protein.toString(),
        carbs: macros.carbs.toString(),
        fat: macros.fat.toString(),
      });
      setAutoCalculated(true);
    }
  };

  const validate = () => {
    const dailyCalories = parseFloat(calorieGoals.dailyCalories);
    const protein = parseFloat(calorieGoals.protein);
    const carbs = parseFloat(calorieGoals.carbs);
    const fat = parseFloat(calorieGoals.fat);

    if (!calorieGoals.dailyCalories || isNaN(dailyCalories) || dailyCalories < 1000) {
      Alert.alert('Validation Error', 'Please enter a valid daily calorie goal (minimum 1000).');
      return false;
    }

    const totalMacroCalories = protein * 4 + carbs * 4 + fat * 9;
    const difference = Math.abs(totalMacroCalories - dailyCalories);

    if (difference > dailyCalories * 0.1) {
      Alert.alert(
        'Macro Mismatch',
        'The sum of your macros should approximately match your daily calorie goal.'
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        calorieGoals: {
          dailyCalories: parseInt(calorieGoals.dailyCalories, 10),
          protein: parseInt(calorieGoals.protein, 10),
          carbs: parseInt(calorieGoals.carbs, 10),
          fat: parseInt(calorieGoals.fat, 10),
        },
      };

      await upsertProfile(profileData);
      Alert.alert('Success', 'Nutrition goals updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!validate()) {
      return;
    }

    const calorieGoalsData = {
      dailyCalories: parseInt(calorieGoals.dailyCalories, 10),
      protein: parseInt(calorieGoals.protein, 10),
      carbs: parseInt(calorieGoals.carbs, 10),
      fat: parseInt(calorieGoals.fat, 10),
    };

    // If in edit mode, save directly
    if (isEditMode) {
      handleSave();
      return;
    }

    // Pass data forward via route params (old app flow)
    navigation.navigate('ProfileSummaryScreen', {
      userProfile: existingProfile,
      personalInfo,
      physicalInfo,
      fitnessGoals,
      calorieGoals: calorieGoalsData,
    });
  };

  const totalMacroCalories =
    parseFloat(calorieGoals.protein || 0) * 4 +
    parseFloat(calorieGoals.carbs || 0) * 4 +
    parseFloat(calorieGoals.fat || 0) * 9;
  const dailyCalories = parseFloat(calorieGoals.dailyCalories || 0);
  const macroMatch = dailyCalories > 0 && Math.abs(totalMacroCalories - dailyCalories) < dailyCalories * 0.1;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Goals</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Set Your Nutrition Goals</Text>
          <Text style={styles.sectionSubtitle}>
            Define your daily calorie and macronutrient targets
          </Text>

          <TouchableOpacity style={styles.autoCalculateButton} onPress={handleAutoCalculate}>
            <Ionicons name="calculator-outline" size={20} color="#2563eb" />
            <Text style={styles.autoCalculateText}>Auto-Calculate Based on Profile</Text>
          </TouchableOpacity>

          <FormTextInput
            label="Daily Calorie Goal *"
            placeholder="2000"
            keyboardType="numeric"
            value={calorieGoals.dailyCalories}
            onChangeText={(text) => {
              setCalorieGoals({ ...calorieGoals, dailyCalories: text });
              setAutoCalculated(false);
            }}
          />

          <View style={styles.macrosSection}>
            <Text style={styles.macrosTitle}>Macronutrients</Text>
            <Text style={styles.macrosSubtitle}>
              Protein and carbs: 4 calories per gram | Fat: 9 calories per gram
            </Text>

            <FormTextInput
              label="Protein (grams)"
              placeholder="150"
              keyboardType="numeric"
              value={calorieGoals.protein}
              onChangeText={(text) => {
                setCalorieGoals({ ...calorieGoals, protein: text });
                setAutoCalculated(false);
              }}
            />

            <FormTextInput
              label="Carbs (grams)"
              placeholder="250"
              keyboardType="numeric"
              value={calorieGoals.carbs}
              onChangeText={(text) => {
                setCalorieGoals({ ...calorieGoals, carbs: text });
                setAutoCalculated(false);
              }}
            />

            <FormTextInput
              label="Fat (grams)"
              placeholder="67"
              keyboardType="numeric"
              value={calorieGoals.fat}
              onChangeText={(text) => {
                setCalorieGoals({ ...calorieGoals, fat: text });
                setAutoCalculated(false);
              }}
            />
          </View>

          {dailyCalories > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Macro Calories:</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    macroMatch ? styles.summaryValueGood : styles.summaryValueWarning,
                  ]}
                >
                  {Math.round(totalMacroCalories)} kcal
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Daily Goal:</Text>
                <Text style={styles.summaryValue}>{Math.round(dailyCalories)} kcal</Text>
              </View>
              {!macroMatch && (
                <Text style={styles.summaryWarning}>
                  Macro calories should be close to your daily goal
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          title={isEditMode ? "Save" : "Review Profile"} 
          onPress={handleNext} 
          loading={loading} 
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  autoCalculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  autoCalculateText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  macrosSection: {
    marginTop: 8,
  },
  macrosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  macrosSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueGood: {
    color: '#10b981',
  },
  summaryValueWarning: {
    color: '#f59e0b',
  },
  summaryWarning: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default CalorieGoalsScreen;


