import { Accelerometer, Gyroscope } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STEPS_KEY = 'fitsera_steps_data';
const CALORIES_KEY = 'fitsera_calories_data';
const STEPS_GOAL_KEY = 'fitsera_steps_goal';

// Initialize sensors
let accelerometerSubscription = null;
let stepCount = 0;
let lastStepTime = Date.now();
let isTracking = false;

// Step detection threshold
const STEP_THRESHOLD = 0.3;
let lastAcceleration = { x: 0, y: 0, z: 0 };

export const startStepTracking = async () => {
  if (isTracking) return;

  try {
    // Load existing step count for today
    const today = new Date().toISOString().split('T')[0];
    const storedData = await AsyncStorage.getItem(STEPS_KEY);
    const stepsData = storedData ? JSON.parse(storedData) : {};
    stepCount = stepsData[today] || 0;

    // Set up accelerometer
    Accelerometer.setUpdateInterval(100);
    
    accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const delta = acceleration - Math.sqrt(
        lastAcceleration.x * lastAcceleration.x +
        lastAcceleration.y * lastAcceleration.y +
        lastAcceleration.z * lastAcceleration.z
      );

      // Detect step (simple algorithm)
      if (Math.abs(delta) > STEP_THRESHOLD && Date.now() - lastStepTime > 300) {
        stepCount++;
        lastStepTime = Date.now();
        saveStepsForToday(stepCount);
      }

      lastAcceleration = { x, y, z };
    });

    isTracking = true;
  } catch (error) {
    console.error('Error starting step tracking:', error);
  }
};

export const stopStepTracking = () => {
  if (accelerometerSubscription) {
    accelerometerSubscription.remove();
    accelerometerSubscription = null;
  }
  isTracking = false;
};

const saveStepsForToday = async (steps) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedData = await AsyncStorage.getItem(STEPS_KEY);
    const stepsData = storedData ? JSON.parse(storedData) : {};
    stepsData[today] = steps;
    await AsyncStorage.setItem(STEPS_KEY, JSON.stringify(stepsData));
  } catch (error) {
    console.error('Error saving steps:', error);
  }
};

export const getTodaySteps = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedData = await AsyncStorage.getItem(STEPS_KEY);
    const stepsData = storedData ? JSON.parse(storedData) : {};
    return stepsData[today] || stepCount || 0;
  } catch (error) {
    console.error('Error getting today steps:', error);
    return stepCount || 0;
  }
};

export const getWeeklySteps = async () => {
  try {
    const storedData = await AsyncStorage.getItem(STEPS_KEY);
    const stepsData = storedData ? JSON.parse(storedData) : {};
    const weeklyData = {};
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      weeklyData[dateKey] = stepsData[dateKey] || 0;
    }
    
    return weeklyData;
  } catch (error) {
    console.error('Error getting weekly steps:', error);
    return {};
  }
};

export const setStepsGoal = async (goal) => {
  try {
    await AsyncStorage.setItem(STEPS_GOAL_KEY, goal.toString());
  } catch (error) {
    console.error('Error setting steps goal:', error);
  }
};

export const getStepsGoal = async () => {
  try {
    const goal = await AsyncStorage.getItem(STEPS_GOAL_KEY);
    return goal ? parseInt(goal, 10) : 10000; // Default 10,000 steps
  } catch (error) {
    console.error('Error getting steps goal:', error);
    return 10000;
  }
};

// Calculate calories burned based on steps and user profile
export const calculateCaloriesBurned = async (steps, profile) => {
  try {
    // Average calories per step (varies by weight)
    const weightKg = profile?.weightKg || 70;
    const caloriesPerStep = weightKg * 0.04 / 1000; // Rough estimate
    return Math.round(steps * caloriesPerStep);
  } catch (error) {
    console.error('Error calculating calories:', error);
    // Fallback: ~0.04 calories per step
    return Math.round(steps * 0.04);
  }
};

export const getTodayCaloriesBurned = async (profile) => {
  try {
    const steps = await getTodaySteps();
    return await calculateCaloriesBurned(steps, profile);
  } catch (error) {
    console.error('Error getting calories burned:', error);
    return 0;
  }
};

