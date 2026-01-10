import { apiClient } from '../client';

/**
 * Attendance Service - Handles gym attendance via QR code scanning
 */

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
    return response.data?.data || response.data;
  } catch (error) {
    console.error('[AttendanceService] Error scanning QR code:', error);
    throw error;
  }
};










