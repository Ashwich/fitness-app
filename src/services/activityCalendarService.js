import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyAttendance } from '../api/services/attendanceService';

const LOCAL_KEY = 'fitsera_active_days';

const toIso = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export async function getLocalActiveDays() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Mark today (or a date) as active — intensity 1–4 */
export async function markDayActive(iso = todayISO(), intensity = 1) {
  const key = toIso(iso);
  if (!key) return;
  const map = await getLocalActiveDays();
  const prev = map[key]?.level || 0;
  map[key] = {
    level: Math.max(prev, Math.min(4, intensity)),
    sources: Array.from(new Set([...(map[key]?.sources || []), 'local'])),
  };
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  return map;
}

function extractAttendanceDates(raw) {
  const list = Array.isArray(raw)
    ? raw
    : raw?.history || raw?.records || raw?.attendance || raw?.items || [];
  const map = {};
  (Array.isArray(list) ? list : []).forEach((row) => {
    const iso =
      toIso(row.date) ||
      toIso(row.day) ||
      toIso(row.checkInAt) ||
      toIso(row.checkIn) ||
      toIso(row.createdAt) ||
      toIso(row.timestamp);
    if (!iso) return;
    map[iso] = {
      level: Math.max(map[iso]?.level || 0, 3),
      sources: Array.from(new Set([...(map[iso]?.sources || []), 'gym'])),
      count: (map[iso]?.count || 0) + 1,
    };
  });
  return map;
}

/**
 * Merged activity map: { 'YYYY-MM-DD': { level: 0-4, sources, count? } }
 */
export async function getActivityMap() {
  const local = await getLocalActiveDays();
  let gym = {};
  try {
    const attendance = await getMyAttendance();
    gym = extractAttendanceDates(attendance);
  } catch {
    gym = {};
  }

  const merged = { ...local };
  Object.keys(gym).forEach((iso) => {
    const g = gym[iso];
    const l = merged[iso];
    merged[iso] = {
      level: Math.max(l?.level || 0, g.level || 0),
      sources: Array.from(new Set([...(l?.sources || []), ...(g.sources || [])])),
      count: (l?.count || 0) + (g.count || 0),
    };
  });
  return merged;
}

export function countActiveDays(activityMap, daysBack = 365) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let n = 0;
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (activityMap[iso]?.level > 0) n += 1;
  }
  return n;
}

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
