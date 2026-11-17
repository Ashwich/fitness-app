import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitsera_period_tracking';

const defaultState = {
  enabled: false,
  cycleLengthDays: 28,
  periodLengthDays: 5,
  lastPeriodStart: null, // ISO date YYYY-MM-DD
  notes: '',
};

export async function getPeriodSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

export async function savePeriodSettings(patch) {
  const current = await getPeriodSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Predicted next period start from last start + cycle length */
export function predictNextPeriod(settings) {
  if (!settings?.lastPeriodStart || !settings?.cycleLengthDays) return null;
  const start = new Date(`${settings.lastPeriodStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start);
  next.setDate(next.getDate() + Number(settings.cycleLengthDays));
  return next.toISOString().split('T')[0];
}

/** Day in current cycle (1-based), or null */
export function dayInCycle(settings, today = new Date()) {
  if (!settings?.lastPeriodStart) return null;
  const start = new Date(`${settings.lastPeriodStart}T12:00:00`);
  const t = new Date(today);
  t.setHours(12, 0, 0, 0);
  const diff = Math.floor((t - start) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  const cycle = Number(settings.cycleLengthDays) || 28;
  return (diff % cycle) + 1;
}

export function isPeriodDay(settings, today = new Date()) {
  const day = dayInCycle(settings, today);
  if (day == null) return false;
  return day <= (Number(settings.periodLengthDays) || 5);
}
