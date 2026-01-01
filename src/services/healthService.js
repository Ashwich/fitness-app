import { Accelerometer, Gyroscope } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const STEPS_KEY = 'fitsera_steps_data';
const CALORIES_KEY = 'fitsera_calories_data';
const STEPS_GOAL_KEY = 'fitsera_steps_goal';

// Try to import react-native-health (requires native build)
let AppleHealthKit = null;
let GoogleFit = null;
let isHealthKitAvailable = false;
let isHealthKitInitialized = false;

// Check if we're in Expo Go (which doesn't support native modules)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

try {
  if (isExpoGo) {
    console.log('[HealthService] ⚠️ Running in Expo Go - react-native-health requires a development build');
    console.log('[HealthService] To use HealthKit/Google Fit, create a development build:');
    console.log('[HealthService]   1. Run: npx expo prebuild');
    console.log('[HealthService]   2. Run: npx expo run:ios (or run:android)');
    console.log('[HealthService] Using fallback accelerometer method for now');
    isHealthKitAvailable = false;
  } else if (Platform.OS === 'ios') {
    const RNHealth = require('react-native-health');
    // react-native-health exports AppleHealthKit as default
    AppleHealthKit = RNHealth.default || RNHealth;
    console.log('[HealthService] ✅ AppleHealthKit loaded:', !!AppleHealthKit);
    isHealthKitAvailable = !!AppleHealthKit;
  } else if (Platform.OS === 'android') {
    const RNHealth = require('react-native-health');
    // For Android, react-native-health uses GoogleFit
    GoogleFit = RNHealth.GoogleFit || RNHealth.default || RNHealth;
    console.log('[HealthService] ✅ GoogleFit loaded:', !!GoogleFit);
    isHealthKitAvailable = !!GoogleFit;
  }
} catch (error) {
  console.log('[HealthService] ⚠️ react-native-health not available (requires native build)');
  console.log('[HealthService] Error details:', error.message);
  console.log('[HealthService] Using fallback accelerometer method');
  isHealthKitAvailable = false;
}

// Initialize sensors (fallback method)
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

// Initialize HealthKit/Google Fit permissions
export const initializeHealthKit = async () => {
  console.log('[HealthService] initializeHealthKit called');
  console.log('[HealthService] isHealthKitAvailable:', isHealthKitAvailable);
  console.log('[HealthService] Platform.OS:', Platform.OS);
  
  if (!isHealthKitAvailable) {
    console.log('[HealthService] HealthKit/Google Fit not available - requires native build (not Expo Go)');
    console.log('[HealthService] Falling back to accelerometer-based step tracking');
    return false;
  }

  if (isHealthKitInitialized) {
    console.log('[HealthService] HealthKit/Google Fit already initialized');
    return true;
  }

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      console.log('[HealthService] Initializing Apple HealthKit...');
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.StepCount,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          ],
          write: [],
        },
      };

      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (error) => {
          if (error) {
            console.error('[HealthService] HealthKit initialization error:', error);
            console.error('[HealthService] Error details:', JSON.stringify(error, null, 2));
            resolve(false);
          } else {
            console.log('[HealthService] ✅ HealthKit initialized successfully');
            isHealthKitInitialized = true;
            resolve(true);
          }
        });
      });
    } else if (Platform.OS === 'android' && GoogleFit) {
      console.log('[HealthService] Initializing Google Fit...');
      
      return new Promise((resolve) => {
        // Check if already authorized
        GoogleFit.isAuthorized()
          .then((authorized) => {
            if (authorized) {
              console.log('[HealthService] ✅ Google Fit already authorized');
              isHealthKitInitialized = true;
              resolve(true);
            } else {
              console.log('[HealthService] Requesting Google Fit authorization...');
              // Request authorization
              return GoogleFit.authorize({
                scopes: [
                  'https://www.googleapis.com/auth/fitness.activity.read',
                  'https://www.googleapis.com/auth/fitness.activity.write',
                ],
              });
            }
          })
          .then((result) => {
            if (result && result.success !== false) {
              console.log('[HealthService] ✅ Google Fit authorized successfully');
              isHealthKitInitialized = true;
              resolve(true);
            } else {
              console.error('[HealthService] Google Fit authorization failed:', result);
              resolve(false);
            }
          })
          .catch((error) => {
            console.error('[HealthService] Google Fit authorization error:', error);
            console.error('[HealthService] Error details:', JSON.stringify(error, null, 2));
            resolve(false);
          });
      });
    }
    console.log('[HealthService] No health kit available for platform');
    return false;
  } catch (error) {
    console.error('[HealthService] Error initializing health kit:', error);
    console.error('[HealthService] Error stack:', error.stack);
    return false;
  }
};

// Get steps from HealthKit/Google Fit
const getStepsFromHealthKit = async () => {
  if (!isHealthKitAvailable) {
    console.log('[HealthService] HealthKit not available');
    return null;
  }

  if (!isHealthKitInitialized) {
    console.log('[HealthService] HealthKit not initialized yet');
    return null;
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    console.log('[HealthService] Fetching steps from native health app...');
    console.log('[HealthService] Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        const options = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        };

        console.log('[HealthService] Calling AppleHealthKit.getStepCount with options:', options);
        
        AppleHealthKit.getStepCount(options, (error, results) => {
          if (error) {
            console.error('[HealthService] ❌ Error getting steps from HealthKit:', error);
            console.error('[HealthService] Error details:', JSON.stringify(error, null, 2));
            resolve(null);
          } else {
            const steps = results?.value || 0;
            console.log('[HealthService] ✅ Steps from HealthKit:', steps);
            console.log('[HealthService] Full results:', JSON.stringify(results, null, 2));
            resolve(Math.round(steps));
          }
        });
      });
    } else if (Platform.OS === 'android' && GoogleFit) {
      return new Promise((resolve) => {
        console.log('[HealthService] Calling GoogleFit.getDailyStepCountSamples...');
        
        GoogleFit.getDailyStepCountSamples({
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        })
          .then((samples) => {
            console.log('[HealthService] Google Fit samples received:', JSON.stringify(samples, null, 2));
            let totalSteps = 0;
            if (samples && Array.isArray(samples) && samples.length > 0) {
              samples.forEach((sample) => {
                if (sample.steps && Array.isArray(sample.steps)) {
                  sample.steps.forEach((step) => {
                    totalSteps += step.value || 0;
                  });
                } else if (sample.value) {
                  totalSteps += sample.value;
                }
              });
            }
            console.log('[HealthService] ✅ Steps from Google Fit:', totalSteps);
            resolve(Math.round(totalSteps));
          })
          .catch((error) => {
            console.error('[HealthService] ❌ Error getting steps from Google Fit:', error);
            console.error('[HealthService] Error details:', JSON.stringify(error, null, 2));
            resolve(null);
          });
      });
    }
    return null;
  } catch (error) {
    console.error('[HealthService] ❌ Exception in getStepsFromHealthKit:', error);
    console.error('[HealthService] Error stack:', error.stack);
    return null;
  }
};

export const getTodaySteps = async () => {
  try {
    // Try to get steps from HealthKit/Google Fit first
    if (isHealthKitAvailable) {
      const healthKitSteps = await getStepsFromHealthKit();
      if (healthKitSteps !== null && healthKitSteps !== undefined) {
        // Save to local storage for backup
        const today = new Date().toISOString().split('T')[0];
        await saveStepsForToday(healthKitSteps);
        return healthKitSteps;
      }
    }

    // Fallback to local storage/accelerometer
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
    if (!steps || steps === 0) {
      return 0;
    }
    
    // Average calories per step varies by weight
    // Formula: calories per step = (weight in kg * 0.0005) + 0.02
    // This gives approximately 0.04-0.05 calories per step for average weight
    const weightKg = profile?.weightKg || 70;
    const caloriesPerStep = (weightKg * 0.0005) + 0.02;
    const totalCalories = steps * caloriesPerStep;
    
    console.log('[HealthService] Calories calculation:', {
      steps,
      weightKg,
      caloriesPerStep: caloriesPerStep.toFixed(4),
      totalCalories: Math.round(totalCalories),
    });
    
    return Math.round(totalCalories);
  } catch (error) {
    console.error('Error calculating calories:', error);
    // Fallback: ~0.04 calories per step (standard estimate)
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

