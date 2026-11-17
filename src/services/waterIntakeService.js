import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';

const WATER_GOAL_KEY = 'fitsera_water_goal';
const WATER_DATA_KEY = 'fitsera_water_data';
const WATER_REMINDER_KEY = 'fitsera_water_reminders';

// expo-notifications throws on Android Expo Go (remote push removed in SDK 53).
// Only load it in development/production builds.
const canUseNotifications = !isRunningInExpoGo();
let Notifications = null;

if (canUseNotifications) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const getWaterGoal = async () => {
  try {
    // Prefer server preference when available
    try {
      const { fetchPreferences } = require('../api/services/profileService');
      const prefs = await fetchPreferences();
      if (prefs?.waterGoalMl) {
        const liters = prefs.waterGoalMl / 1000;
        await AsyncStorage.setItem(WATER_GOAL_KEY, String(liters));
        return liters;
      }
    } catch {
      /* offline / unauthenticated */
    }
    const goal = await AsyncStorage.getItem(WATER_GOAL_KEY);
    return goal ? parseFloat(goal) : 3.0;
  } catch (error) {
    console.error('Error getting water goal:', error);
    return 3.0;
  }
};

export const setWaterGoal = async (goalInLiters) => {
  try {
    await AsyncStorage.setItem(WATER_GOAL_KEY, goalInLiters.toString());
    try {
      const { upsertPreferences } = require('../api/services/profileService');
      await upsertPreferences({ waterGoalMl: Math.round(Number(goalInLiters) * 1000) });
    } catch {
      /* ignore server sync failure */
    }
  } catch (error) {
    console.error('Error setting water goal:', error);
  }
};

export const addWaterIntake = async (amountInLiters) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedData = await AsyncStorage.getItem(WATER_DATA_KEY);
    const waterData = storedData ? JSON.parse(storedData) : {};

    if (!waterData[today]) {
      waterData[today] = 0;
    }

    waterData[today] += amountInLiters;
    await AsyncStorage.setItem(WATER_DATA_KEY, JSON.stringify(waterData));

    return waterData[today];
  } catch (error) {
    console.error('Error adding water intake:', error);
    throw error;
  }
};

export const getTodayWaterIntake = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedData = await AsyncStorage.getItem(WATER_DATA_KEY);
    const waterData = storedData ? JSON.parse(storedData) : {};
    return waterData[today] || 0;
  } catch (error) {
    console.error('Error getting today water intake:', error);
    return 0;
  }
};

export const getWeeklyWaterIntake = async () => {
  try {
    const storedData = await AsyncStorage.getItem(WATER_DATA_KEY);
    const waterData = storedData ? JSON.parse(storedData) : {};
    const weeklyData = {};

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      weeklyData[dateKey] = waterData[dateKey] || 0;
    }

    return weeklyData;
  } catch (error) {
    console.error('Error getting weekly water intake:', error);
    return {};
  }
};

export const setupWaterReminders = async (enabled, intervalHours = 2) => {
  try {
    if (!canUseNotifications || !Notifications) {
      console.log(
        '[WaterReminders] Skipped in Expo Go — use a development build for notifications'
      );
      await AsyncStorage.setItem(WATER_REMINDER_KEY, enabled ? 'true' : 'false');
      return;
    }

    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.setItem(WATER_REMINDER_KEY, 'false');
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const reminderTimes = [];
    const startHour = 8;
    const endHour = 20;

    for (let hour = startHour; hour <= endHour; hour += intervalHours) {
      reminderTimes.push(hour);
    }

    for (const hour of reminderTimes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to Drink Water!',
          body: 'Stay hydrated! Remember to drink water.',
          sound: true,
        },
        trigger: {
          hour,
          minute: 0,
          repeats: true,
        },
      });
    }

    await AsyncStorage.setItem(WATER_REMINDER_KEY, 'true');
  } catch (error) {
    console.error('Error setting up water reminders:', error);
  }
};

export const areRemindersEnabled = async () => {
  try {
    const enabled = await AsyncStorage.getItem(WATER_REMINDER_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};
