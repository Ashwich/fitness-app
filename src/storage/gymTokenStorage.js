import * as SecureStore from 'expo-secure-store';

const GYM_TOKEN_KEY = 'fitsera_gym_token';
const STAFF_TOKEN_KEY = 'fitsera_staff_token';

export const saveGymToken = async (token) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.warn('Attempted to save invalid gym token');
    return;
  }
  try {
    await SecureStore.setItemAsync(GYM_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving gym token to SecureStore:', error);
    throw error;
  }
};

export const getGymToken = async () => {
  return SecureStore.getItemAsync(GYM_TOKEN_KEY);
};

export const deleteGymToken = async () => {
  await SecureStore.deleteItemAsync(GYM_TOKEN_KEY);
};

export const saveStaffToken = async (token) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.warn('Attempted to save invalid staff token');
    return;
  }
  try {
    await SecureStore.setItemAsync(STAFF_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving staff token to SecureStore:', error);
    throw error;
  }
};

export const getStaffToken = async () => {
  return SecureStore.getItemAsync(STAFF_TOKEN_KEY);
};

export const deleteStaffToken = async () => {
  await SecureStore.deleteItemAsync(STAFF_TOKEN_KEY);
};


