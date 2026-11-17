import { apiClient } from '../client';

const extractData = (response) => {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data !== undefined) return response.data;
  return response;
};

/**
 * Scan QR code to mark attendance
 * @param {string} qrCode - QR code data from scanner
 * @returns {Promise<Object>} Attendance result
 */
export const scanQrCode = async (qrCode) => {
  try {
    const response = await apiClient.post('/attendance/scan-qr', {
      qrCode,
    });
    return extractData(response);
  } catch (error) {
    console.error('[AttendanceService] Error scanning QR code:', error);
    throw error;
  }
};

/** Member attendance history for linked gym */
export const getMyAttendance = async () => {
  const response = await apiClient.get('/attendance/me');
  return extractData(response);
};

/** Gym streak leaderboard */
export const getAttendanceStreaks = async (limit = 20) => {
  const response = await apiClient.get('/attendance/streaks', {
    params: { limit },
  });
  return extractData(response);
};

/** Retry linking this user to a gym by phone/email match */
export const retryGymLink = async () => {
  const response = await apiClient.get('/gym/link');
  return extractData(response);
};

/** List gym memberships matching this user's phone */
export const getGymMatches = async () => {
  const response = await apiClient.get('/gym/matches');
  const data = extractData(response);
  return Array.isArray(data?.matches) ? data.matches : Array.isArray(data) ? data : [];
};

/** Choose which gym to sync when multiple matches exist */
export const selectGym = async ({ gymId, memberId }) => {
  const response = await apiClient.post('/gym/select', { gymId, memberId });
  return extractData(response);
};
