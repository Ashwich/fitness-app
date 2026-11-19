import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitsera_units';
const listeners = new Set();
let current = 'metric';

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'imperial' || v === 'metric') {
      current = v;
      listeners.forEach((l) => l(v));
    }
  })
  .catch(() => {});

export async function setUnits(units) {
  current = units === 'imperial' ? 'imperial' : 'metric';
  listeners.forEach((l) => l(current));
  try {
    await AsyncStorage.setItem(KEY, current);
  } catch {
    /* in-memory value still applies this session */
  }
}

/** 'metric' | 'imperial', shared across screens. Data is always stored metric. */
export function useUnits() {
  const [units, set] = useState(current);
  useEffect(() => {
    listeners.add(set);
    return () => listeners.delete(set);
  }, []);
  return units;
}

export const kgToLb = (kg) => Math.round(kg * 2.20462);
export const lbToKg = (lb) => Math.round((lb / 2.20462) * 10) / 10;
export const cmToFtIn = (cm) => {
  const totalIn = Math.round(cm / 2.54);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
};

export function formatWeight(kg, units) {
  if (!kg) return '—';
  return units === 'imperial' ? `${kgToLb(kg)} lb` : `${Math.round(kg * 10) / 10} kg`;
}

export function formatHeight(cm, units) {
  if (!cm) return '—';
  if (units === 'imperial') {
    const { ft, inch } = cmToFtIn(cm);
    return `${ft}′ ${inch}″`;
  }
  return `${Math.round(cm)} cm`;
}
