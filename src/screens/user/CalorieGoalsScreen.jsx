import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const { width } = Dimensions.get('window');

const CalorieGoalsScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};
  const fitnessGoals = route.params?.fitnessGoals || {};

  const existingCalorieGoals = existingProfile?.calorieGoals || {};
  
  const [calorieGoals, setCalorieGoals] = useState({
    dailyCalories: existingCalorieGoals?.dailyCalories?.toString() || '',
    protein: existingCalorieGoals?.protein?.toString() || '',
    carbs: existingCalorieGoals?.carbs?.toString() || '',
    fat: existingCalorieGoals?.fat?.toString() || '',
  });

  const [loading, setLoading] = useState(false);
  const [autoCalculated, setAutoCalculated] = useState(false);

  // --- LOGIC REMAINS UNCHANGED ---
  const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age || !gender) return null;
    let weightKg = weight;
    let heightCm = height;
    if (existingProfile?.weightUnit === 'lbs') weightKg = weight * 0.453592;
    if (existingProfile?.heightUnit === 'ft') heightCm = height * 30.48;
    else if (existingProfile?.heightUnit === 'in') heightCm = height * 2.54;

    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'male' ? Math.round(bmr + 5) : Math.round(bmr - 161);
  };

  const calculateTDEE = (bmr, activityLevel) => {
    const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extremely_active: 1.9 };
    return Math.round(bmr * (multipliers[activityLevel] || 1.2));
  };

  const calculateMacros = (tdee, goal) => {
    let adjustment = goal === 'weight_loss' ? -500 : (goal === 'weight_gain' ? 500 : (goal === 'muscle_gain' ? 300 : 0));
    const dailyCalories = Math.max(1200, tdee + adjustment);
    return {
      dailyCalories,
      protein: Math.round((dailyCalories * 0.3) / 4),
      carbs: Math.round((dailyCalories * 0.4) / 4),
      fat: Math.round((dailyCalories * 0.3) / 9),
    };
  };

  const handleAutoCalculate = () => {
    const weight = physicalInfo?.weightKg || physicalInfo?.weight;
    const height = physicalInfo?.heightCm || physicalInfo?.height;
    const bmr = calculateBMR(weight, height, personalInfo?.age, personalInfo?.gender);
    if (!bmr) return;
    const tdee = calculateTDEE(bmr, fitnessGoals?.exerciseLevel);
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
    if (!calorieGoals.dailyCalories || isNaN(dailyCalories) || dailyCalories < 1000) {
      Alert.alert('Error', 'Minimum goal is 1000 kcal.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    const data = {
        dailyCalories: parseInt(calorieGoals.dailyCalories, 10),
        protein: parseInt(calorieGoals.protein, 10),
        carbs: parseInt(calorieGoals.carbs, 10),
        fat: parseInt(calorieGoals.fat, 10),
    };
    if (isEditMode) {
        handleSave(data);
    } else {
        navigation.navigate('ProfileSummaryScreen', { ...route.params, calorieGoals: data });
    }
  };

  const handleSave = async (data) => {
    setLoading(true);
    try {
      await upsertProfile({ calorieGoals: data });
      Alert.alert('Success', 'Goals updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally { setLoading(false); }
  };

  const totalMacroCals = (parseFloat(calorieGoals.protein || 0) * 4) + (parseFloat(calorieGoals.carbs || 0) * 4) + (parseFloat(calorieGoals.fat || 0) * 9);
  const diff = Math.abs(totalMacroCals - parseFloat(calorieGoals.dailyCalories || 0));
  const isMatch = parseFloat(calorieGoals.dailyCalories) > 0 && diff < (parseFloat(calorieGoals.dailyCalories) * 0.1);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Plan</Text>
        <TouchableOpacity onPress={handleAutoCalculate}>
            <Text style={styles.magicText}>Auto-Fill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
            <Text style={styles.mainTitle}>What's the goal?</Text>
            <Text style={styles.mainSubtitle}>We'll help you balance your macros for optimal results.</Text>
        </View>

        {/* Calorie Card */}
        <View style={styles.inputCard}>
            <View style={styles.cardHeader}>
                <Ionicons name="flame" size={20} color="#f97316" />
                <Text style={styles.cardHeaderText}>Energy Target</Text>
            </View>
            <FormTextInput
                label="Daily Calories (kcal)"
                placeholder="2000"
                keyboardType="numeric"
                value={calorieGoals.dailyCalories}
                onChangeText={(t) => { setCalorieGoals({...calorieGoals, dailyCalories: t}); setAutoCalculated(false); }}
            />
        </View>

        {/* Macros Card */}
        <View style={styles.inputCard}>
            <View style={styles.cardHeader}>
                <Ionicons name="pie-chart" size={20} color="#6366f1" />
                <Text style={styles.cardHeaderText}>Macronutrients</Text>
            </View>
            
            <View style={styles.macroRow}>
                <View style={styles.macroInputWrap}>
                    <FormTextInput
                        label="Protein (g)"
                        placeholder="150"
                        keyboardType="numeric"
                        value={calorieGoals.protein}
                        onChangeText={(t) => { setCalorieGoals({...calorieGoals, protein: t}); setAutoCalculated(false); }}
                    />
                </View>
                <View style={styles.macroInputWrap}>
                    <FormTextInput
                        label="Carbs (g)"
                        placeholder="200"
                        keyboardType="numeric"
                        value={calorieGoals.carbs}
                        onChangeText={(t) => { setCalorieGoals({...calorieGoals, carbs: t}); setAutoCalculated(false); }}
                    />
                </View>
                <View style={styles.macroInputWrap}>
                    <FormTextInput
                        label="Fat (g)"
                        placeholder="60"
                        keyboardType="numeric"
                        value={calorieGoals.fat}
                        onChangeText={(t) => { setCalorieGoals({...calorieGoals, fat: t}); setAutoCalculated(false); }}
                    />
                </View>
            </View>

            {/* Visual Balance Bar */}
            <View style={styles.ratioBarContainer}>
                <View style={[styles.ratioSegment, { flex: Math.max(1, parseFloat(calorieGoals.protein) || 0), backgroundColor: '#3b82f6' }]} />
                <View style={[styles.ratioSegment, { flex: Math.max(1, parseFloat(calorieGoals.carbs) || 0), backgroundColor: '#10b981', marginHorizontal: 2 }]} />
                <View style={[styles.ratioSegment, { flex: Math.max(1, parseFloat(calorieGoals.fat) || 0), backgroundColor: '#f59e0b' }]} />
            </View>
            <View style={styles.ratioLabels}>
                <Text style={styles.ratioLabel}>Protein</Text>
                <Text style={styles.ratioLabel}>Carbs</Text>
                <Text style={styles.ratioLabel}>Fats</Text>
            </View>
        </View>

        {/* Status Summary */}
        {parseFloat(calorieGoals.dailyCalories) > 0 && (
            <View style={[styles.summaryBox, isMatch ? styles.summaryMatch : styles.summaryMismatch]}>
                <View style={styles.summaryInfo}>
                    <Ionicons 
                        name={isMatch ? "checkmark-circle" : "warning"} 
                        size={24} 
                        color={isMatch ? "#10b981" : "#f59e0b"} 
                    />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.summaryTitle}>
                            {isMatch ? "Macros Balanced" : "Macro Mismatch"}
                        </Text>
                        <Text style={styles.summaryDetail}>
                            Macro sum: {Math.round(totalMacroCals)} kcal
                        </Text>
                    </View>
                </View>
                {!isMatch && (
                    <TouchableOpacity onPress={handleAutoCalculate} style={styles.fixButton}>
                        <Text style={styles.fixButtonText}>Fix</Text>
                    </TouchableOpacity>
                )}
            </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          title={isEditMode ? "Save Changes" : "Review Profile"} 
          onPress={handleNext} 
          loading={loading} 
          style={styles.mainBtn}
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  backButton: { width: 40 },
  magicText: { color: '#6366f1', fontWeight: '700', fontSize: 14 },
  
  content: { flex: 1, backgroundColor: '#f8fafc' },
  topSection: { padding: 24 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  mainSubtitle: { fontSize: 15, color: '#64748b', marginTop: 8, lineHeight: 22 },

  inputCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardHeaderText: { fontSize: 16, fontWeight: '700', color: '#334155', marginLeft: 8 },
  
  macroRow: { flexDirection: 'row', gap: 12 },
  macroInputWrap: { flex: 1 },

  ratioBarContainer: {
    height: 8,
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  ratioSegment: { height: '100%' },
  ratioLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ratioLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },

  summaryBox: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderWidth: 1,
  },
  summaryMatch: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  summaryMismatch: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  summaryInfo: { flexDirection: 'row', alignItems: 'center' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  summaryDetail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  
  fixButton: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  fixButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  mainBtn: { borderRadius: 16, height: 56 },
});

export default CalorieGoalsScreen;