import { apiClient } from '../client';

const extractData = (response) => {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data !== undefined) return response.data;
  return response;
};

const isNoTemplatesError = (error) => {
  const status = error?.response?.status;
  const msg = String(
    error?.response?.data?.error || error?.response?.data?.message || ''
  ).toLowerCase();
  return (
    status === 404 &&
    (msg.includes('no workout templates') || msg.includes('workout template'))
  );
};

/**
 * Active workout for the user.
 * Returns null when the server has no templates yet (expected until catalog is seeded).
 */
export const getActiveWorkout = async () => {
  try {
    const response = await apiClient.get('/workouts/active');
    return extractData(response);
  } catch (error) {
    if (isNoTemplatesError(error)) {
      return null;
    }
    throw error;
  }
};

/**
 * Suggest & activate a workout from templates.
 * Returns null when no templates exist on the server.
 */
export const suggestWorkout = async () => {
  try {
    const response = await apiClient.post('/workouts/suggest');
    return extractData(response);
  } catch (error) {
    if (isNoTemplatesError(error)) {
      return null;
    }
    throw error;
  }
};

export const updateWorkout = async (planId, days) => {
  const response = await apiClient.put(`/workouts/${planId}`, { days });
  return extractData(response);
};
