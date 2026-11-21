import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { colors, radii, space, FONT_FAMILY } from '../../theme/opengym';
import CalorieRing from '../../components/nutrition/CalorieRing';
import { toLocalISODate } from '../../utils/date';

const MEAL_TYPES = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', color: colors.orange },
  brunch: { label: 'Brunch', icon: 'cafe-outline', color: colors.accent },
  dinner: { label: 'Dinner', icon: 'moon-outline', color: colors.blue },
  snacks: { label: 'Snacks', icon: 'nutrition-outline', color: colors.purple },
};

const NutritionDiaryScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [diaryEntry, setDiaryEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false); // Track if we've completed at least one load
  const isLoadingRef = useRef(false); // Track if a load is currently in progress
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodAmount, setFoodAmount] = useState('100'); // Default 100g
  const [stats, setStats] = useState(null);
  // Initialize selectedDate to today's date
  const getTodayDate = () => {
    const today = new Date();
    return toLocalISODate(today);
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Opened from Eat with a meal to add to (e.g. "Add dinner").
  const addMealParam = route?.params?.addMeal;
  useEffect(() => {
    if (addMealParam && MEAL_TYPES[addMealParam]) {
      setSelectedMeal(addMealParam);
      setSearchQuery('');
      setSearchResults([]);
      setShowFoodModal(true);
      navigation.setParams?.({ addMeal: undefined });
    }
  }, [addMealParam, navigation]);

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
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('[NutritionDiary] Load already in progress, skipping duplicate call');
      return;
    }
    
    isLoadingRef.current = true;
    
    // Always ensure loading state is managed
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    try {
      if (showLoading) {
        setLoading(true);
        // Safety timeout - ensure loading is cleared after 10 seconds
        loadingTimeoutRef.current = setTimeout(() => {
          console.warn('[NutritionDiary] Loading timeout - clearing loading state');
          setLoading(false);
          loadingTimeoutRef.current = null;
          isLoadingRef.current = false;
        }, 10000);
      }
      
      // Check if user is authenticated before making requests
      if (!user) {
        console.warn('[NutritionDiary] No user found, skipping data load');
        if (showLoading) {
          setLoading(false);
        }
        // Set diaryEntry to null to show empty state
        if (!diaryEntry) {
          setDiaryEntry(null);
        }
        return;
      }
      
      // Load profile for nutrition goals
      try {
        const profileData = await fetchProfile();
        if (profileData?.calorieGoals && typeof profileData.calorieGoals === 'string') {
          try {
            profileData.calorieGoals = JSON.parse(profileData.calorieGoals);
          } catch (e) {
            console.warn('Failed to parse calorieGoals:', e);
          }
        }
        setProfile(profileData);
      } catch (profileError) {
        console.error('[NutritionDiary] Error loading profile:', profileError);
        // Continue even if profile fails - we can still show diary
      }

      // Load diary entry for selected date
      // Use today's date if selectedDate is not set or is invalid
      const dateToFetch = selectedDate || toLocalISODate();
      console.log('[NutritionDiary] Fetching diary entry for date:', dateToFetch);
      
      // getDiaryEntry handles 404s internally and returns null, so no try-catch needed here
      // But we'll wrap it to be safe
      let entry = null;
      try {
        entry = await getDiaryEntry(dateToFetch);
        console.log('[NutritionDiary] Loaded diary entry:', entry ? 'Found' : 'Not found (normal if no food added)');
      } catch (diaryError) {
        // getDiaryEntry should never throw for 404s, but handle other errors
        console.error('[NutritionDiary] Unexpected error from getDiaryEntry:', diaryError);
        // Don't throw - set entry to null and continue
        entry = null;
      }
      
      // Process the entry
      const processedEntry = entry ? processDiaryEntry(entry) : null;
      
      // Always update if we got valid data
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
        setDiaryEntry(processedEntry);
      } else {
        // If we got null/404, only update state if:
        // 1. This is an initial load (showLoading=true) AND we don't have existing data
        // 2. OR if we have existing data but it's for a different date
        const currentDate = diaryEntry?.date || selectedDate;
        if (showLoading && !diaryEntry) {
          // Initial load with no existing data - set to null to show empty state
          console.log('[NutritionDiary] Initial load: no diary entry found, setting to null (will show empty state)');
          setDiaryEntry(null);
        } else if (currentDate !== dateToFetch) {
          // Different date requested - update to null for new date
          console.log('[NutritionDiary] Different date requested, clearing existing data');
          setDiaryEntry(null);
        } else {
          // Same date, refresh call - preserve existing data
          console.log('[NutritionDiary] Got null entry on refresh for same date, preserving existing state');
          // Don't update diaryEntry - keep existing data
        }
      }

      // Load stats (only if showLoading is true to avoid unnecessary calls)
      if (showLoading) {
        try {
          const statsData = await getDiaryStats(30);
          setStats(statsData);
        } catch (statsError) {
          console.error('[NutritionDiary] Error loading stats:', statsError);
          // Don't block UI if stats fail
        }
      }
    } catch (error) {
      console.error('[NutritionDiary] Error loading diary data:', error);
      // Don't show alert for 404 (no entry for date) or auth errors (already handled)
      // Also handle "User not found" errors from backend (which are actually 404s for diary)
      const is404 = error.response?.status === 404;
      const isUserNotFound = error.response?.data?.error?.includes('User not found') || 
                            error.response?.data?.error?.includes('Diary entry not found');
      
      if (!is404 && !isUserNotFound && !error.message?.includes('User authentication failed')) {
        // Only show alert for real errors, not expected 404s
        Alert.alert('Error', getReadableError(error));
      }
      
      // Ensure loading state is cleared even on error
      // Always set diaryEntry to null on initial load if we get an error (to show empty state)
      if (showLoading) {
        if (!diaryEntry) {
          setDiaryEntry(null);
        }
        setLoading(false);
      }
    } finally {
      // Always clear loading state after first load completes
      // This ensures the screen doesn't get stuck in loading state
      if (!hasLoadedRef.current) {
        // First load - always clear loading
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
        hasLoadedRef.current = true; // Mark that we've completed at least one load
      } else if (showLoading) {
        // Subsequent loads with showLoading=true - clear loading
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
      } else {
        // Subsequent loads with showLoading=false - just clear timeout, don't change loading state
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
      
      // Always clear the loading flag
      isLoadingRef.current = false;
    }
  }, [selectedDate, processDiaryEntry, user]); // Removed diaryEntry from dependencies to prevent infinite loop
  
  // Set initial date on mount
  useEffect(() => {
    const today = getTodayDate();
    if (!selectedDate || selectedDate !== today) {
      setSelectedDate(today);
    }
  }, []); // Only run once on mount

  // Initial load after date is set
  useEffect(() => {
    // Only run initial load once, when selectedDate is set and we haven't loaded yet
    if (!hasLoadedRef.current && selectedDate && !isLoadingRef.current) {
      console.log('[NutritionDiary] Component mounted, loading initial data');
      loadData(true);
    }
  }, [selectedDate, loadData]); // Run when selectedDate is set

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reload data when screen comes into focus to ensure we have latest data
      // This ensures data persists when user leaves and comes back
      // Use false to preserve existing data if API call fails
      console.log('[NutritionDiary] Screen focused, reloading data');
      
      // Only reload if we've already completed the initial load
      // This prevents duplicate calls on first focus (initial load is handled by useEffect)
      if (hasLoadedRef.current && !isLoadingRef.current) {
        // Ensure selectedDate is set to today if not set
        const today = getTodayDate();
        if (!selectedDate || selectedDate !== today) {
          setSelectedDate(today);
          // If date changed, wait for it to update before loading
          return;
        }
        loadData(false); // Don't show loading spinner on focus (preserves existing data better)
      }
    }, [loadData, selectedDate]) // Removed diaryEntry and loading from dependencies
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
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
      });

      // Calculate nutrition for the amount
      // Since we already have food data from search (either from database or external API),
      // we can calculate directly without making another API call
      let nutrition;
      
      // Check if we have complete nutrition data in the selected food
      if (selectedFood.calories !== undefined && selectedFood.calories !== null) {
        // Use food data directly (from database or external API) - no additional API call needed
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
        console.log('[NutritionDiary] Calculated nutrition from food data (no API call):', nutrition);
      } else if (foodId && foodId !== 'unknown') {
        // Fallback: if we don't have nutrition data, try API (shouldn't happen if backend works correctly)
        try {
          console.log('[NutritionDiary] Food data incomplete, fetching nutrition from API for foodId:', foodId);
          nutrition = await getFoodNutrition(foodId, amount, selectedFood);
          console.log('[NutritionDiary] Nutrition from API:', nutrition);
        } catch (nutritionError) {
          console.warn('[NutritionDiary] Could not get nutrition from API, using defaults:', nutritionError);
          // Last resort: use defaults
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
        }
      } else {
        // No food ID and no nutrition data - use defaults
        console.warn('[NutritionDiary] No valid food ID or nutrition data, using defaults');
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
        console.log('[NutritionDiary] Entry meals after processing:', {
          breakfast: Array.isArray(processedEntry.breakfast) ? processedEntry.breakfast.length : 0,
          brunch: Array.isArray(processedEntry.brunch) ? processedEntry.brunch.length : 0,
          dinner: Array.isArray(processedEntry.dinner) ? processedEntry.dinner.length : 0,
          snacks: Array.isArray(processedEntry.snacks) ? processedEntry.snacks.length : 0,
        });
        setDiaryEntry(processedEntry);
        // Don't call loadData() here - the updatedEntry from the API is the source of truth
        // Calling loadData() can cause a 404 error that overwrites our valid data
      } else {
        // If no entry returned, reload from server as fallback
        console.warn('[NutritionDiary] No updated entry returned, reloading from server');
        // Wait a bit for backend to process, then reload
        setTimeout(async () => {
          await loadData(false); // Don't show loading state
        }, 500);
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
    // Always return a valid object, even if diaryEntry is null
    const defaultTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    if (!diaryEntry) {
      return defaultTotals;
    }
    
    // Always try to use backend-calculated totals first (most reliable)
    if (diaryEntry.totalCalories !== undefined && diaryEntry.totalCalories !== null) {
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

  // Safely calculate daily total - ensure diaryEntry is handled
  const dailyTotal = calculateDailyTotal();
  const goals = profile?.calorieGoals || {};
  
  // Ensure we have valid values
  if (!dailyTotal || typeof dailyTotal !== 'object') {
    console.warn('[NutritionDiary] Invalid dailyTotal, using defaults');
  }
  
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

    return (
      <View key={mealType} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <View style={[styles.mealIconWrap, { backgroundColor: `${mealConfig.color}22` }]}>
              <Ionicons name={mealConfig.icon} size={16} color={mealConfig.color} />
            </View>
            <Text style={styles.mealTitle}>{mealConfig.label}</Text>
          </View>
          <TouchableOpacity
            style={styles.addMealButton}
            onPress={() => {
              setSelectedMeal(mealType);
              setSearchQuery('');
              setSearchResults([]);
              setShowFoodModal(true);
            }}
          >
            <Ionicons name="add" size={16} color={colors.accent} />
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
                      <Ionicons name="restaurant-outline" size={22} color={colors.label3} />
                    </View>
                    <View style={styles.foodItemInfo}>
                      <Text style={styles.foodItemName}>{item.foodName}</Text>
                      <Text style={styles.foodItemCalories}>
                        {Math.round(item.calories)} kcal · P {Math.round(item.protein || 0)}g
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFood(mealType, item.id || item.foodId)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyMeal}>
            <Ionicons name="restaurant-outline" size={28} color={colors.label3} />
            <Text style={styles.emptyMealText}>
              No items added yet. Tap + Add to log your {mealConfig.label.toLowerCase()}.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate circular progress for calories
  const caloriesProgressAngle = Math.min(360, (caloriesProgress / 100) * 360);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading diary...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding={true}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diary</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.summaryCard}>
          <CalorieRing
            consumed={dailyTotal.calories || 0}
            goal={goals.dailyCalories || 2000}
          />
          <View style={styles.macroCol}>
            {[
              {
                key: 'protein',
                label: 'Protein',
                color: colors.accent,
                value: dailyTotal.protein || 0,
                goal: goals.protein || 150,
              },
              {
                key: 'carbs',
                label: 'Carbs',
                color: colors.orange,
                value: dailyTotal.carbs || 0,
                goal: goals.carbs || 200,
              },
              {
                key: 'fat',
                label: 'Fats',
                color: colors.purple,
                value: dailyTotal.fat || 0,
                goal: goals.fat || 60,
              },
            ].map((m) => {
              const pct = Math.min(100, ((m.value || 0) / (m.goal || 1)) * 100);
              return (
                <View key={m.key} style={styles.macroRow}>
                  <View style={styles.macroTop}>
                    <Text style={styles.macroName}>{m.label}</Text>
                    <Text style={styles.macroVals}>
                      {Math.round(m.value)} / {Math.round(m.goal)}g
                    </Text>
                  </View>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        { width: `${pct}%`, backgroundColor: m.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {!goals.dailyCalories ? (
          <TouchableOpacity
            style={styles.goalsBanner}
            onPress={() => navigation.navigate('CalorieGoalsScreen')}
            activeOpacity={0.9}
          >
            <Ionicons name="flag" size={18} color={colors.onAccent} />
            <Text style={styles.goalsBannerText}>Set your nutrition goals</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onAccent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.goalsBanner}
            onPress={() => navigation.navigate('CalorieGoalsScreen')}
            activeOpacity={0.9}
          >
            <Ionicons name="flag" size={18} color={colors.onAccent} />
            <Text style={styles.goalsBannerText}>Nutrition goals · edit targets</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onAccent} />
          </TouchableOpacity>
        )}

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
                  <Ionicons name="close" size={24} color={colors.label} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search for food (e.g., green salad, chicken breast)"
                placeholderTextColor={colors.label3}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearchFood(text);
                }}
                autoFocus={true}
              />

              {searching && (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator size="small" color={colors.accent} />
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
                      <Ionicons name="chevron-forward" size={20} color={colors.label3} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={colors.label3} style={styles.noResultsIcon} />
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
                  <Ionicons name="close" size={24} color={colors.label} />
                </TouchableOpacity>
              </View>

              <Text style={styles.amountLabel}>Amount (grams)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="100"
                placeholderTextColor={colors.label3}
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
                <Ionicons name="add-circle" size={20} color={colors.onAccent} />
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
    color: colors.label2,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 12,
    paddingHorizontal: space.pad,
    backgroundColor: colors.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600',
    color: colors.label,
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
    zIndex: 2,
  },
  headerDate: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '500',
    color: colors.label2,
  },
  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: space.pad,
    paddingBottom: 32,
    gap: 14,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
  },
  macroCol: { flex: 1, gap: 12 },
  macroRow: { gap: 6 },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: { fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '600', color: colors.label2 },
  macroVals: { fontFamily: FONT_FAMILY, fontSize: 11, color: colors.label3, fontWeight: '500' },
  macroTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: 4 },
  goalsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  goalsBannerText: {
    flex: 1,
    color: colors.onAccent,
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.pad,
    backgroundColor: colors.surface,
  },
  dateText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
  },
  statsCard: {
    backgroundColor: colors.surface,
    marginVertical: 12,
    padding: space.pad,
    borderRadius: radii.card,
  },
  statsTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
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
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  statLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
    marginTop: 4,
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  circularProgressWrapper: {
    marginBottom: 20,
  },
  circularProgressOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 16,
    borderColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgress: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 34,
    fontWeight: '700',
    color: colors.label,
    letterSpacing: -0.5,
  },
  circularProgressLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: colors.label3,
    marginTop: 4,
  },
  macroBoxesContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  macroBoxLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: colors.label3,
    marginBottom: 4,
  },
  macroBoxPercentage: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    color: colors.label,
  },
  progressTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 16,
  },
  progressRow: {
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
    marginBottom: 4,
  },
  progressValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: colors.label,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: colors.label3,
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
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: colors.label3,
    marginBottom: 4,
  },
  macroValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 4,
  },
  macroPercentage: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: colors.accent,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
    letterSpacing: -0.2,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
  },
  addMealButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  mealItems: {
    marginTop: 4,
    gap: 10,
  },
  foodItemCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 4,
  },
  foodItemCalories: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
  },
  foodItemDetails: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
  },
  foodDetailText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: colors.label2,
    marginBottom: 4,
  },
  removeButton: {
    padding: 6,
  },
  emptyMeal: {
    padding: 18,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: 8,
  },
  emptyMealText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: colors.label3,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  setGoalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: space.pad,
    borderRadius: radii.card,
    gap: 12,
    marginBottom: 16,
  },
  setGoalsText: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.pad,
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
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600',
    color: colors.label,
    flex: 1,
    marginRight: 12,
  },
  searchInput: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: 16,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: colors.label,
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
    color: colors.label2,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },
  searchResultsList: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sep,
  },
  searchResultLeft: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 4,
  },
  searchResultNutrition: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsIcon: {
    marginBottom: 16,
  },
  noResultsText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: colors.label2,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label3,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  amountLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: 16,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: colors.label,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: colors.onAccent,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionPreview: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: space.pad,
    marginBottom: 16,
  },
  nutritionPreviewTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 12,
  },
  nutritionPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nutritionPreviewLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.label2,
  },
  nutritionPreviewValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
  },
});

export default NutritionDiaryScreen;

