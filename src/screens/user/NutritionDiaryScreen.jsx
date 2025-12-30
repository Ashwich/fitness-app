import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';
import { searchFood, getFoodNutrition } from '../../api/services/foodService';
import {
  getDiaryEntry,
  saveDiaryEntry,
  updateDiaryEntry,
  addFoodToMeal,
  removeFoodFromMeal,
  getDiaryStats,
} from '../../api/services/diaryService';
import { getReadableError } from '../../utils/apiError';

const MEAL_TYPES = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', color: '#f59e0b' },
  brunch: { label: 'Brunch', icon: 'cafe-outline', color: '#10b981' },
  dinner: { label: 'Dinner', icon: 'moon-outline', color: '#6366f1' },
  snacks: { label: 'Snacks', icon: 'fast-food-outline', color: '#ec4899' },
};

const NutritionDiaryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [diaryEntry, setDiaryEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodAmount, setFoodAmount] = useState('100'); // Default 100g
  const [stats, setStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Helper function to process diary entry (parse JSON strings, ensure arrays, etc.)
  const processDiaryEntry = useCallback((entry) => {
    if (!entry) return null;
    
    // Create a copy to avoid mutating the original
    const processedEntry = { ...entry };
    
    // Ensure meals are arrays (they might be JSON strings or objects)
    try {
      processedEntry.breakfast = Array.isArray(processedEntry.breakfast) 
        ? processedEntry.breakfast 
        : (processedEntry.breakfast ? (typeof processedEntry.breakfast === 'string' ? JSON.parse(processedEntry.breakfast) : processedEntry.breakfast) : []);
      processedEntry.brunch = Array.isArray(processedEntry.brunch) 
        ? processedEntry.brunch 
        : (processedEntry.brunch ? (typeof processedEntry.brunch === 'string' ? JSON.parse(processedEntry.brunch) : processedEntry.brunch) : []);
      processedEntry.dinner = Array.isArray(processedEntry.dinner) 
        ? processedEntry.dinner 
        : (processedEntry.dinner ? (typeof processedEntry.dinner === 'string' ? JSON.parse(processedEntry.dinner) : processedEntry.dinner) : []);
      processedEntry.snacks = Array.isArray(processedEntry.snacks) 
        ? processedEntry.snacks 
        : (processedEntry.snacks ? (typeof processedEntry.snacks === 'string' ? JSON.parse(processedEntry.snacks) : processedEntry.snacks) : []);
    } catch (e) {
      console.warn('[NutritionDiary] Failed to parse meal arrays:', e);
      processedEntry.breakfast = Array.isArray(processedEntry.breakfast) ? processedEntry.breakfast : [];
      processedEntry.brunch = Array.isArray(processedEntry.brunch) ? processedEntry.brunch : [];
      processedEntry.dinner = Array.isArray(processedEntry.dinner) ? processedEntry.dinner : [];
      processedEntry.snacks = Array.isArray(processedEntry.snacks) ? processedEntry.snacks : [];
    }
    
    // Ensure totals are numbers
    processedEntry.totalCalories = processedEntry.totalCalories !== undefined && processedEntry.totalCalories !== null ? parseFloat(processedEntry.totalCalories) : 0;
    processedEntry.totalProtein = processedEntry.totalProtein !== undefined && processedEntry.totalProtein !== null ? parseFloat(processedEntry.totalProtein) : 0;
    processedEntry.totalCarbs = processedEntry.totalCarbs !== undefined && processedEntry.totalCarbs !== null ? parseFloat(processedEntry.totalCarbs) : 0;
    processedEntry.totalFat = processedEntry.totalFat !== undefined && processedEntry.totalFat !== null ? parseFloat(processedEntry.totalFat) : 0;
    
    return processedEntry;
  }, []);

  // Load profile and diary entry
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
      setLoading(true);
      }
      
      // Check if user is authenticated before making requests
      if (!user) {
        console.warn('[NutritionDiary] No user found, skipping data load');
        if (showLoading) {
          setLoading(false);
        }
        return;
      }
      
      // Load profile for nutrition goals
      const profileData = await fetchProfile();
      if (profileData?.calorieGoals && typeof profileData.calorieGoals === 'string') {
        try {
          profileData.calorieGoals = JSON.parse(profileData.calorieGoals);
        } catch (e) {
          console.warn('Failed to parse calorieGoals:', e);
        }
      }
      setProfile(profileData);

      // Load diary entry for selected date
      try {
      const entry = await getDiaryEntry(selectedDate);
      console.log('[NutritionDiary] Loaded diary entry:', entry);
      
        // Process the entry
        const processedEntry = processDiaryEntry(entry);
        
        // Only update state if we got valid data, or if this is an initial load (showLoading=true)
        // This prevents overwriting valid data with null when refreshing after adding food
        if (processedEntry || showLoading) {
          if (processedEntry) {
        console.log('[NutritionDiary] Parsed diary entry:', {
              breakfast: processedEntry.breakfast?.length || 0,
              brunch: processedEntry.brunch?.length || 0,
              dinner: processedEntry.dinner?.length || 0,
              snacks: processedEntry.snacks?.length || 0,
              totalCalories: processedEntry.totalCalories,
              totalProtein: processedEntry.totalProtein,
              totalCarbs: processedEntry.totalCarbs,
              totalFat: processedEntry.totalFat,
        });
      }
          setDiaryEntry(processedEntry);
        } else {
          // If we got null and this is a refresh (not initial load), keep existing data
          console.log('[NutritionDiary] Got null entry on refresh, preserving existing state');
        }
      } catch (diaryError) {
        // If it's a "User not found" error, don't clear existing data
        if (diaryError.message?.includes('User authentication failed')) {
          console.error('[NutritionDiary] Authentication error, preserving existing data');
          console.error('[NutritionDiary] This might be a backend issue - POST /diary/meal works but GET /diary fails');
          // Don't update diaryEntry - keep existing data
          // For refresh calls (showLoading=false), silently ignore the error
          // For initial loads (showLoading=true), we'll show a warning but not break the UI
          if (showLoading) {
            // Log the error but don't throw - allow the UI to continue with existing data
            console.warn('[NutritionDiary] Initial load failed with auth error, but continuing with existing state');
            // Set diaryEntry to null only if we don't have existing data
            // This allows the UI to show "no data" state on first load
            if (!diaryEntry) {
              setDiaryEntry(null);
            }
          }
          // Don't re-throw - preserve existing data and continue
        } else {
          // For other errors, re-throw to be handled by outer catch
          throw diaryError;
        }
      }

      // Load stats (only if showLoading is true to avoid unnecessary calls)
      if (showLoading) {
      const statsData = await getDiaryStats(30);
      setStats(statsData);
      }
    } catch (error) {
      console.error('[NutritionDiary] Error loading diary data:', error);
      // Don't show alert for 404 (no entry for date) or auth errors (already handled)
      if (error.response?.status !== 404 && !error.message?.includes('User authentication failed')) {
        Alert.alert('Error', getReadableError(error));
      }
    } finally {
      if (showLoading) {
      setLoading(false);
    }
    }
  }, [selectedDate, processDiaryEntry, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Search for food
  const handleSearchFood = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      console.log('[NutritionDiary] Searching for food:', query);
      const results = await searchFood(query.trim());
      console.log('[NutritionDiary] Search results:', results?.length || 0, 'items');
      console.log('[NutritionDiary] Results data:', results);
      
      // Ensure results is an array
      const resultsArray = Array.isArray(results) ? results : [];
      setSearchResults(resultsArray);
      
      if (resultsArray.length === 0) {
        console.log('[NutritionDiary] No results found for:', query);
      }
    } catch (error) {
      console.error('[NutritionDiary] Error searching food:', error);
      console.error('[NutritionDiary] Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to search for food: ${error.message || 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Select food and show amount input
  const handleSelectFood = (food) => {
    console.log('[NutritionDiary] Food selected:', food);
    setSelectedFood(food);
    setFoodAmount('100'); // Default to 100g
    // Clear search to hide search modal, amount modal will show
    setSearchQuery('');
    setSearchResults([]);
  };

  // Add food to meal
  const handleAddFood = async () => {
    if (!selectedFood || !selectedMeal) {
      Alert.alert('Error', 'Please select a food and meal type.');
      return;
    }

    const amount = parseFloat(foodAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in grams.');
      return;
    }

    try {
      console.log('[NutritionDiary] Adding food:', {
        food: selectedFood.name || selectedFood.foodName,
        meal: selectedMeal,
        amount: amount,
      });

      // Get food ID - prioritize database ID, fallback to foodId
      const foodId = selectedFood.id || selectedFood.foodId;
      console.log('[NutritionDiary] Food ID to use:', foodId);
      console.log('[NutritionDiary] Selected food object:', {
        id: selectedFood.id,
        foodId: selectedFood.foodId,
        name: selectedFood.name || selectedFood.foodName,
        calories: selectedFood.calories,
      });

      // Calculate nutrition for the amount
      let nutrition;
      if (foodId && foodId !== 'unknown') {
        try {
          console.log('[NutritionDiary] Fetching nutrition from API for foodId:', foodId);
          nutrition = await getFoodNutrition(foodId, amount);
          console.log('[NutritionDiary] Nutrition from API:', nutrition);
        } catch (nutritionError) {
          console.warn('[NutritionDiary] Could not get nutrition from API, calculating from food data:', nutritionError);
          console.warn('[NutritionDiary] Error details:', nutritionError.response?.data || nutritionError.message);
          // Fallback: calculate from food data (per 100g)
          nutrition = null; // Will use fallback below
        }
      } else {
        console.warn('[NutritionDiary] No valid food ID, using food data directly');
      }

      // If API call failed or no ID, calculate from food data (per 100g)
      if (!nutrition) {
        const ratio = amount / 100;
        nutrition = {
          calories: (selectedFood.calories || 0) * ratio,
          protein: (selectedFood.protein || 0) * ratio,
          carbs: (selectedFood.carbs || 0) * ratio,
          fat: (selectedFood.fat || 0) * ratio,
          fiber: (selectedFood.fiber || 0) * ratio,
          sugar: (selectedFood.sugar || 0) * ratio,
          sodium: (selectedFood.sodium || 0) * ratio,
        };
        console.log('[NutritionDiary] Calculated nutrition from food data:', nutrition);
      }
      
      const foodItem = {
        foodId: foodId || 'unknown',
        foodName: selectedFood.name || selectedFood.foodName || 'Unknown Food',
        amount: amount,
        calories: Math.round((nutrition?.calories || 0) * 100) / 100, // Round to 2 decimals
        protein: Math.round((nutrition?.protein || 0) * 100) / 100,
        carbs: Math.round((nutrition?.carbs || 0) * 100) / 100,
        fat: Math.round((nutrition?.fat || 0) * 100) / 100,
        fiber: Math.round((nutrition?.fiber || 0) * 100) / 100,
        sugar: Math.round((nutrition?.sugar || 0) * 100) / 100,
        sodium: Math.round((nutrition?.sodium || 0) * 100) / 100,
      };

      console.log('[NutritionDiary] Food item to add:', foodItem);

      const updatedEntry = await addFoodToMeal(selectedMeal, foodItem, selectedDate);
      console.log('[NutritionDiary] Updated entry from addFoodToMeal:', updatedEntry);
      
      // Process and update the diary entry immediately with the response
      if (updatedEntry) {
        const processedEntry = processDiaryEntry(updatedEntry);
        console.log('[NutritionDiary] Processed updated entry:', processedEntry);
        setDiaryEntry(processedEntry);
        // Don't call loadData() here - the updatedEntry from the API is the source of truth
        // Calling loadData() can cause a 404 error that overwrites our valid data
      } else {
        // If no entry returned, reload from server as fallback
        console.warn('[NutritionDiary] No updated entry returned, reloading from server');
        await loadData(false); // Don't show loading state
      }
      
      // Show success message
      Alert.alert('Success', `${foodItem.foodName} added to ${MEAL_TYPES[selectedMeal]?.label}!`);
      
      // Close modals and reset state
      setSelectedFood(null);
      setSelectedMeal(null);
      setSearchQuery('');
      setSearchResults([]);
      setFoodAmount('100'); // Reset to default
      setShowFoodModal(false);
    } catch (error) {
      console.error('[NutritionDiary] Error adding food:', error);
      console.error('[NutritionDiary] Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to add food: ${getReadableError(error)}`);
    }
  };

  // Remove food from meal
  const handleRemoveFood = async (mealType, foodItemId) => {
    Alert.alert(
      'Remove Food',
      'Are you sure you want to remove this food item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFoodFromMeal(mealType, foodItemId, selectedDate);
              await loadData(false); // Don't show loading state when removing
            } catch (error) {
              console.error('Error removing food:', error);
              Alert.alert('Error', getReadableError(error));
            }
          },
        },
      ]
    );
  };

  // Calculate totals for a meal
  const calculateMealTotal = (meal) => {
    // Handle different data types
    let mealArray = meal;
    if (!mealArray) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // If it's a string, try to parse it
    if (typeof mealArray === 'string') {
      try {
        mealArray = JSON.parse(mealArray);
      } catch (e) {
        console.warn('[NutritionDiary] Failed to parse meal as JSON:', e);
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(mealArray)) {
      console.warn('[NutritionDiary] Meal is not an array:', typeof mealArray, mealArray);
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    const totals = mealArray.reduce(
      (total, item) => {
        const itemCalories = parseFloat(item.calories) || 0;
        const itemProtein = parseFloat(item.protein) || 0;
        const itemCarbs = parseFloat(item.carbs) || 0;
        const itemFat = parseFloat(item.fat) || 0;
        
        return {
          calories: total.calories + itemCalories,
          protein: total.protein + itemProtein,
          carbs: total.carbs + itemCarbs,
          fat: total.fat + itemFat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    
    // Round to 2 decimal places
    return {
      calories: Math.round(totals.calories * 100) / 100,
      protein: Math.round(totals.protein * 100) / 100,
      carbs: Math.round(totals.carbs * 100) / 100,
      fat: Math.round(totals.fat * 100) / 100,
    };
  };

  // Calculate daily totals
  const calculateDailyTotal = () => {
    // Always try to use backend-calculated totals first (most reliable)
    if (diaryEntry && diaryEntry.totalCalories !== undefined && diaryEntry.totalCalories !== null) {
      const backendTotals = {
        calories: parseFloat(diaryEntry.totalCalories) || 0,
        protein: parseFloat(diaryEntry.totalProtein) || 0,
        carbs: parseFloat(diaryEntry.totalCarbs) || 0,
        fat: parseFloat(diaryEntry.totalFat) || 0,
      };
      
      console.log('[NutritionDiary] Using backend totals:', backendTotals);
      return backendTotals;
    }

    // Fallback: calculate from meal arrays
    console.log('[NutritionDiary] Backend totals not available, calculating from meals');
    const breakfast = calculateMealTotal(diaryEntry?.breakfast);
    const brunch = calculateMealTotal(diaryEntry?.brunch);
    const dinner = calculateMealTotal(diaryEntry?.dinner);
    const snacks = calculateMealTotal(diaryEntry?.snacks);

    const calculatedTotals = {
      calories: Math.round((breakfast.calories + brunch.calories + dinner.calories + snacks.calories) * 100) / 100,
      protein: Math.round((breakfast.protein + brunch.protein + dinner.protein + snacks.protein) * 100) / 100,
      carbs: Math.round((breakfast.carbs + brunch.carbs + dinner.carbs + snacks.carbs) * 100) / 100,
      fat: Math.round((breakfast.fat + brunch.fat + dinner.fat + snacks.fat) * 100) / 100,
    };
    
    console.log('[NutritionDiary] Calculated totals from meals:', calculatedTotals);
    return calculatedTotals;
  };

  // Calculate progress percentage
  const calculateProgress = (current, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  };

  const dailyTotal = calculateDailyTotal();
  const goals = profile?.calorieGoals || {};
  
  // Log for debugging
  console.log('[NutritionDiary] === Daily Progress Calculation ===');
  console.log('[NutritionDiary] Daily totals:', dailyTotal);
  console.log('[NutritionDiary] Goals:', goals);
  console.log('[NutritionDiary] Diary entry totals:', diaryEntry ? {
    totalCalories: diaryEntry.totalCalories,
    totalProtein: diaryEntry.totalProtein,
    totalCarbs: diaryEntry.totalCarbs,
    totalFat: diaryEntry.totalFat,
  } : 'null');
  console.log('[NutritionDiary] Meal counts:', diaryEntry ? {
    breakfast: Array.isArray(diaryEntry.breakfast) ? diaryEntry.breakfast.length : 0,
    brunch: Array.isArray(diaryEntry.brunch) ? diaryEntry.brunch.length : 0,
    dinner: Array.isArray(diaryEntry.dinner) ? diaryEntry.dinner.length : 0,
    snacks: Array.isArray(diaryEntry.snacks) ? diaryEntry.snacks.length : 0,
  } : 'null');
  
  const caloriesProgress = calculateProgress(dailyTotal.calories || 0, goals.dailyCalories);
  const proteinProgress = calculateProgress(dailyTotal.protein || 0, goals.protein);
  const carbsProgress = calculateProgress(dailyTotal.carbs || 0, goals.carbs);
  const fatProgress = calculateProgress(dailyTotal.fat || 0, goals.fat);
  
  console.log('[NutritionDiary] Progress percentages:', {
    calories: caloriesProgress,
    protein: proteinProgress,
    carbs: carbsProgress,
    fat: fatProgress,
  });

  const renderMealSection = (mealType) => {
    const mealConfig = MEAL_TYPES[mealType];
    const mealItems = diaryEntry?.[mealType] || [];
    const mealTotal = calculateMealTotal(mealItems);

    return (
      <View key={mealType} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>{mealConfig.label}</Text>
          <TouchableOpacity 
            style={styles.addMealButton}
            onPress={() => {
              setSelectedMeal(mealType);
              setSearchQuery('');
              setSearchResults([]);
              setShowFoodModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#10b981" />
            <Text style={styles.addMealButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {mealItems.length > 0 ? (
          <View style={styles.mealItems}>
            {mealItems.map((item, index) => (
              <View key={item.id || index} style={styles.foodItemCard}>
                <View style={styles.foodItemHeader}>
                  <View style={styles.foodItemLeft}>
                    <View style={styles.foodIconPlaceholder}>
                      <Ionicons name="restaurant-outline" size={24} color="#6b7280" />
                    </View>
                    <View style={styles.foodItemInfo}>
                      <Text style={styles.foodItemName}>{item.foodName}</Text>
                      <Text style={styles.foodItemCalories}>
                        {Math.round(item.calories)} kcal
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFood(mealType, item.id || item.foodId)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.foodItemDetails}>
                  <Text style={styles.foodDetailText}>
                    Calories: {Math.round(item.calories)} kcal
                  </Text>
                  <Text style={styles.foodDetailText}>
                    Carbs: {Math.round(item.carbs || 0)} g
                  </Text>
                  <Text style={styles.foodDetailText}>
                    Protein: {Math.round(item.protein || 0)} g
                  </Text>
                  <Text style={styles.foodDetailText}>
                    Fats: {Math.round(item.fat || 0)} g
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyMeal}>
            <Text style={styles.emptyMealText}>No items added yet</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading diary...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Calculate macronutrient percentages based on goals (not total macros)
  const carbsGoalPercentage = goals.carbs && goals.carbs > 0 
    ? Math.min(100, Math.round(((dailyTotal.carbs || 0) / goals.carbs) * 100)) 
    : 0;
  const proteinGoalPercentage = goals.protein && goals.protein > 0 
    ? Math.min(100, Math.round(((dailyTotal.protein || 0) / goals.protein) * 100)) 
    : 0;
  const fatGoalPercentage = goals.fat && goals.fat > 0 
    ? Math.min(100, Math.round(((dailyTotal.fat || 0) / goals.fat) * 100)) 
    : 0;

  // Calculate circular progress for calories
  const caloriesProgressAngle = Math.min(360, (caloriesProgress / 100) * 360);

  return (
    <ScreenContainer noPadding={true}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Activity</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons name="calendar-outline" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Circular Progress Chart */}
        {goals.dailyCalories ? (
          <View style={styles.circularProgressContainer}>
            <View style={styles.circularProgressWrapper}>
              {/* Circular Progress Ring */}
              <View style={styles.circularProgressOuter}>
                <View style={styles.circularProgress}>
                  <View style={styles.circularProgressInner}>
                    <Text style={styles.circularProgressValue}>
                      {Math.round(dailyTotal.calories || 0)}
                    </Text>
                    <Text style={styles.circularProgressLabel}>Total kcal</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Macronutrient Boxes */}
            <View style={styles.macroBoxesContainer}>
              <View style={styles.macroBox}>
                <View style={[styles.macroDot, { backgroundColor: '#ec4899' }]} />
                <Text style={styles.macroBoxLabel}>Carbs</Text>
                <Text style={styles.macroBoxPercentage}>{carbsGoalPercentage}%</Text>
              </View>
              <View style={styles.macroBox}>
                <View style={[styles.macroDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.macroBoxLabel}>Protein</Text>
                <Text style={styles.macroBoxPercentage}>{proteinGoalPercentage}%</Text>
              </View>
              <View style={styles.macroBox}>
                <View style={[styles.macroDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.macroBoxLabel}>Fats</Text>
                <Text style={styles.macroBoxPercentage}>{fatGoalPercentage}%</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.setGoalsCard}>
            <Ionicons name="nutrition-outline" size={24} color="#2563eb" />
            <Text style={styles.setGoalsText}>Set your nutrition goals to track progress</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CalorieGoalsScreen')}>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Meals */}
        {Object.keys(MEAL_TYPES).map((mealType) => renderMealSection(mealType))}
      </ScrollView>

      {/* Food Search Modal */}
      {selectedMeal && !selectedFood && (
        <Modal
          visible={showFoodModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowFoodModal(false);
            setSearchQuery('');
            setSearchResults([]);
            setSelectedMeal(null);
            setSelectedFood(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowFoodModal(false);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedMeal(null);
                setSelectedFood(null);
              }}
            />
            <ScrollView 
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Add to {MEAL_TYPES[selectedMeal]?.label}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowFoodModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedMeal(null);
                    setSelectedFood(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search for food (e.g., green salad, chicken breast)"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearchFood(text);
                }}
                autoFocus={true}
              />

              {searching && (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.searchingText}>Searching...</Text>
                </View>
              )}

              {!searching && searchResults.length > 0 && (
                <View>
                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || item.foodId || index.toString()}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectFood(item)}
                    >
                      <View style={styles.searchResultLeft}>
                        <Text style={styles.searchResultName}>
                          {item.name || item.foodName}
                        </Text>
                        <Text style={styles.searchResultNutrition}>
                          {Math.round(item.calories || 0)} kcal per 100g
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color="#9ca3af" style={styles.noResultsIcon} />
                  <Text style={styles.noResultsText}>No foods found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching with a different term (e.g., "chicken breast", "apple", "rice")
                  </Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Food Amount Modal */}
      {selectedFood && selectedMeal && (
        <Modal
          visible={!!selectedFood}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setSelectedFood(null);
            // Reset to search modal if meal is still selected
            if (selectedMeal) {
              setSearchQuery('');
              setSearchResults([]);
            } else {
              setShowFoodModal(false);
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setSelectedFood(null);
                if (selectedMeal) {
                  setSearchQuery('');
                  setSearchResults([]);
                } else {
                  setShowFoodModal(false);
                }
              }}
            />
            <ScrollView 
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedFood.name || selectedFood.foodName}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFood(null);
                    // Reset to search modal if meal is still selected
                    if (selectedMeal) {
                      setSearchQuery('');
                      setSearchResults([]);
                    } else {
                      setShowFoodModal(false);
                    }
                  }}
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <Text style={styles.amountLabel}>Amount (grams)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="100"
                value={foodAmount}
                onChangeText={setFoodAmount}
                keyboardType="numeric"
              />

              {/* Show nutrition preview */}
              {selectedFood && foodAmount && !isNaN(parseFloat(foodAmount)) && parseFloat(foodAmount) > 0 && (
                <View style={styles.nutritionPreview}>
                  <Text style={styles.nutritionPreviewTitle}>Nutrition for {foodAmount}g:</Text>
                  <View style={styles.nutritionPreviewRow}>
                    <Text style={styles.nutritionPreviewLabel}>Calories:</Text>
                    <Text style={styles.nutritionPreviewValue}>
                      {Math.round((selectedFood.calories || 0) * parseFloat(foodAmount) / 100)} kcal
                    </Text>
                  </View>
                  <View style={styles.nutritionPreviewRow}>
                    <Text style={styles.nutritionPreviewLabel}>Protein:</Text>
                    <Text style={styles.nutritionPreviewValue}>
                      {Math.round((selectedFood.protein || 0) * parseFloat(foodAmount) / 100)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionPreviewRow}>
                    <Text style={styles.nutritionPreviewLabel}>Carbs:</Text>
                    <Text style={styles.nutritionPreviewValue}>
                      {Math.round((selectedFood.carbs || 0) * parseFloat(foodAmount) / 100)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionPreviewRow}>
                    <Text style={styles.nutritionPreviewLabel}>Fat:</Text>
                    <Text style={styles.nutritionPreviewValue}>
                      {Math.round((selectedFood.fat || 0) * parseFloat(foodAmount) / 100)}g
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.addButtonText}>Add to {MEAL_TYPES[selectedMeal]?.label}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  headerDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  calendarButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Circular Progress Chart
  circularProgressContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  circularProgressWrapper: {
    marginBottom: 24,
  },
  circularProgressOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 20,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circularProgress: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  circularProgressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Macronutrient Boxes
  macroBoxesContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  macroBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  macroBoxLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  macroBoxPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  progressRow: {
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#6b7280',
  },
  macrosProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  macroProgressItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  macroPercentage: {
    fontSize: 12,
    color: '#10b981',
  },
  mealSection: {
    marginBottom: 24,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  addMealButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  mealItems: {
    marginTop: 8,
  },
  foodItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  foodItemCalories: {
    fontSize: 14,
    color: '#6b7280',
  },
  foodItemDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  foodDetailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  removeButton: {
    padding: 4,
  },
  emptyMeal: {
    padding: 20,
    alignItems: 'center',
  },
  emptyMealText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  setGoalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  setGoalsText: {
    flex: 1,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  searchingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  searchResultsList: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchResultLeft: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  searchResultNutrition: {
    fontSize: 14,
    color: '#6b7280',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsIcon: {
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nutritionPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  nutritionPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nutritionPreviewLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  nutritionPreviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default NutritionDiaryScreen;

