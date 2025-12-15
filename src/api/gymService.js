import axios from 'axios';
import { ENV } from '../config/env';
import { saveGymToken, saveStaffToken } from '../storage/gymTokenStorage';

const gymClient = axios.create({
  baseURL: ENV.GYM_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeResponse = (data) => {
  if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  }

  return {
    success: true,
    data,
    message: data?.message || 'Success',
  };
};

export const gymOwnerLogin = async (email, password) => {
  const response = await gymClient.post('/gyms/login', { email, password });
  const result = normalizeResponse(response.data);

  if (result.success && result.data?.accessToken) {
    await saveGymToken(result.data.accessToken);
  }

  return result;
};

export const staffLogin = async (email, password) => {
  const response = await gymClient.post('/staff/login', { email, password });
  const result = normalizeResponse(response.data);

  if (result.success && result.data?.accessToken) {
    await saveStaffToken(result.data.accessToken);
  }

  return result;
};


