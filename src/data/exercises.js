/**
 * Exercise catalogue helpers (ported from openGym).
 * Metadata: hasaneyldrm/exercises-dataset (MIT for text).
 * Media (JPG/GIF): © Gym visual — loaded from jsDelivr CDN, not bundled.
 * See EXERCISE_MEDIA_NOTICE.md
 */
import { EXDB } from './exercises-data';

export { EXDB };

export const EXIDX = Object.create(null);
EXDB.forEach((e) => {
  EXIDX[e.id] = e;
});

/** Pinned upstream commit used by openGym mobile builds */
const DATASET_COMMIT = '7455efae41b330c265e7cd4b78dfa848e7ce5ebd';
const IMG_BASE = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${DATASET_COMMIT}/images/`;
const GIF_BASE = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${DATASET_COMMIT}/videos/`;

export const MEDIA_ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

export const imgSrc = (ex) => (ex?.img ? `${IMG_BASE}${ex.img}` : null);
export const gifSrc = (ex) => (ex?.gif ? `${GIF_BASE}${ex.gif}` : null);

export const getExerciseById = (id) => (id ? EXIDX[String(id)] || null : null);

const normalizeName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const NAME_INDEX = Object.create(null);
EXDB.forEach((ex) => {
  const key = normalizeName(ex.n);
  if (!NAME_INDEX[key]) NAME_INDEX[key] = ex;
});

/**
 * Match a plan exercise (name or id) to the openGym catalogue.
 */
export function resolveExercise(input) {
  if (!input) return null;
  if (typeof input === 'string' || typeof input === 'number') {
    return getExerciseById(input) || findByName(String(input));
  }
  if (input.exerciseId || input.id) {
    const byId = getExerciseById(input.exerciseId || input.id);
    if (byId) return byId;
  }
  return findByName(input.name || input.n || input.exerciseName);
}

function findByName(name) {
  const key = normalizeName(name);
  if (!key) return null;
  if (NAME_INDEX[key]) return NAME_INDEX[key];

  // Partial: catalogue name contains query, or query contains catalogue name
  let best = null;
  let bestScore = 0;
  for (let i = 0; i < EXDB.length; i++) {
    const ex = EXDB[i];
    const n = normalizeName(ex.n);
    if (n === key) return ex;
    if (n.includes(key) || key.includes(n)) {
      const score = Math.min(n.length, key.length) / Math.max(n.length, key.length);
      if (score > bestScore) {
        bestScore = score;
        best = ex;
      }
    }
  }
  return bestScore >= 0.45 ? best : null;
}

/** Enrich API plan days with catalogue media + instructions */
export function enrichWorkoutDays(days) {
  if (!Array.isArray(days)) return [];
  return days.map((day) => ({
    ...day,
    exercises: (day.exercises || []).map((ex) => {
      const catalog = resolveExercise(ex);
      return {
        ...ex,
        exerciseId: catalog?.id || ex.exerciseId || null,
        catalogName: catalog?.n || null,
        bodyPart: catalog?.bp || ex.bodyPart || null,
        target: catalog?.tg || ex.target || null,
        equipment: catalog?.eq || ex.equipment || null,
        secondaryMuscles: catalog?.sm || [],
        steps: catalog?.st || ex.steps || [],
        imgUrl: catalog ? imgSrc(catalog) : null,
        gifUrl: catalog ? gifSrc(catalog) : null,
        catalog,
      };
    }),
  }));
}

/**
 * openGym Push/Pull/Legs starter — used as a rich local fallback / demo plan
 * when the API has no template yet.
 */
export const STARTER_PLAN_DAYS = [
  {
    name: 'Push Day',
    exercises: [
      { id: '0025', sets: 4, reps: 8 },
      { id: '0047', sets: 3, reps: 10 },
      { id: '0426', sets: 3, reps: 10 },
      { id: '0334', sets: 3, reps: 12 },
      { id: '0241', sets: 3, reps: 12 },
      { id: '0251', sets: 3, reps: 10 },
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      { id: '2330', sets: 4, reps: 10 },
      { id: '0027', sets: 4, reps: 8 },
      { id: '1323', sets: 3, reps: 10 },
      { id: '0031', sets: 3, reps: 10 },
      { id: '0313', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Leg Day',
    exercises: [
      { id: '0043', sets: 4, reps: 8 },
      { id: '0085', sets: 3, reps: 10 },
      { id: '0739', sets: 3, reps: 12 },
      { id: '0585', sets: 3, reps: 12 },
      { id: '0586', sets: 3, reps: 12 },
      { id: '0605', sets: 4, reps: 15 },
    ],
  },
].map((day) => ({
  ...day,
  exercises: day.exercises.map((ex) => {
    const catalog = getExerciseById(ex.id);
    return {
      name: catalog?.n || ex.id,
      exerciseId: ex.id,
      sets: ex.sets,
      reps: ex.reps,
    };
  }),
}));
