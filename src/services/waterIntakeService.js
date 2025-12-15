import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const WATER_GOAL_KEY = 'fitsera_water_goal';
const WATER_DATA_KEY = 'fitsera_water_data';
const WATER_REMINDER_KEY = 'fitsera_water_reminders';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setWaterGoal = async (goalInLiters) => {
  try {
    await AsyncStorage.setItem(WATER_GOAL_KEY, goalInLiters.toString());
  } catch (error) {
    console.error('Error setting water goal:', error);
  }
};

export const getWaterGoal = async () => {
  try {
    const goal = await AsyncStorage.getItem(WATER_GOAL_KEY);
    return goal ? parseFloat(goal) : 3.0; // Default 3 liters
  } catch (error) {
    console.error('Error getting water goal:', error);
    return 3.0;
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
    if (!enabled) {
      // Cancel all notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.setItem(WATER_REMINDER_KEY, 'false');
      return;
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    // Cancel existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule reminders every X hours (default 2 hours)
    const reminderTimes = [];
    const startHour = 8; // Start at 8 AM
    const endHour = 20; // End at 8 PM
    
    for (let hour = startHour; hour <= endHour; hour += intervalHours) {
      reminderTimes.push(hour);
    }

    // Schedule daily notifications
    for (const hour of reminderTimes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Time to Drink Water!',
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

