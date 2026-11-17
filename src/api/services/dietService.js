import { apiClient } from '../client';

const extractData = (response) => {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data !== undefined) return response.data;
  return response;
};

export const getSuggestedDiets = async () => {
  const response = await apiClient.get('/diets/suggested');
  return extractData(response);
};

export const getActiveDiet = async () => {
  const response = await apiClient.get('/diets/active');
  return extractData(response);
};

export const selectDietTemplate = async (templateId) => {
  const response = await apiClient.post('/diets/select', { templateId });
  return extractData(response);
};

export const completeOnboarding = async (payload) => {
  const response = await apiClient.post('/onboarding/complete', payload);
  return extractData(response);
};
