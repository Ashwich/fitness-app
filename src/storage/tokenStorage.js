import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fitsera_auth_token';

export const saveToken = async (token) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.warn('Attempted to save invalid token');
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token to SecureStore:', error);
    throw error;
  }
};

export const getToken = async () => {
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const deleteToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

