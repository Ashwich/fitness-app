import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  ExerciseThumb,
  MediaAttribution,
} from '../../components/workout/ExerciseMedia';
import ExerciseDetailModal from '../../components/workout/ExerciseDetailModal';
import NumberStepper from '../../components/workout/NumberStepper';
import {
  getActiveWorkout,
  suggestWorkout,
  updateWorkout,
} from '../../api/services/workoutService';
import {
  enrichWorkoutDays,
  STARTER_PLAN_DAYS,
} from '../../data/exercises';
import { getReadableError } from '../../utils/apiError';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, space, typography } from '../../theme/opengym';

const applyDays = (rawDays) =>
  enrichWorkoutDays(Array.isArray(rawDays) ? JSON.parse(JSON.stringify(rawDays)) : []);

const WorkoutPlanScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(null);
  const [plan, setPlan] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [detailExercise, setDetailExercise] = useState(null);

  const applyStarter = useCallback((keepPlanId = null) => {
    const enriched = applyDays(STARTER_PLAN_DAYS);
    setSource('STARTER');
    setPlan({
      id: keepPlanId,
      name: 'Push / Pull / Legs',
      source: 'STARTER',
      days: enriched,
    });
    setDays(enriched);
    setSelectedDay(0);
  }, []);

  const loadLocalFallback = useCallback(async () => {
    try {
      const pending = await AsyncStorage.getItem('fitsera_pending_starter_workout');
      if (pending) {
        const starterDays = applyDays(JSON.parse(pending));
        setSource('STARTER');
        setPlan({
          id: null,
          name: 'Push / Pull / Legs',
          source: 'STARTER',
          days: starterDays,
        });
        setDays(starterDays);
        setSelectedDay(0);
        await AsyncStorage.removeItem('fitsera_pending_starter_workout');
        return;
      }
    } catch {
      /* ignore */
    }
    applyStarter(null);
  }, [applyStarter]);

  const load = useCallback(async () => {
    try {
      const result = await getActiveWorkout();
      if (!result?.plan) {
        await loadLocalFallback();
        return;
      }
      setSource(result?.source || null);
      setPlan(result.plan);
      const enriched = applyDays(result.plan?.days);
      if (enriched.length > 0) {
        setDays(enriched);
        setSelectedDay(0);
      } else {
        await loadLocalFallback();
      }
    } catch (error) {
      await loadLocalFallback();
      console.warn('[Workout] active load fallback:', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLocalFallback]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const result = await suggestWorkout();
      if (!result?.plan) {
        applyStarter(null);
        return;
      }
      setSource(result?.plan?.source || 'AUTO');
      setPlan(result.plan);
      setDays(applyDays(result.plan?.days));
      setSelectedDay(0);
    } catch (error) {
      applyStarter(null);
      console.warn('[Workout] suggest fallback:', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const updateExerciseField = (dayIndex, exIndex, field, value) => {
    setDays((prev) => {
      const next = [...prev];
      const day = {
        ...next[dayIndex],
        exercises: [...(next[dayIndex].exercises || [])],
      };
      day.exercises[exIndex] = { ...day.exercises[exIndex], [field]: value };
      next[dayIndex] = day;
      return next;
    });
  };

  const handleSave = async () => {
    if (!plan?.id) {
      Alert.alert(
        'Not saved to server',
        'This starter plan is local until the API creates a plan.'
      );
      return;
    }
    setSaving(true);
    try {
      const normalizedDays = days.map((day) => ({
        name: day.name,
        exercises: (day.exercises || []).map((ex) => ({
          name: ex.name || ex.catalogName,
          exerciseId: ex.exerciseId || undefined,
          sets: ex.sets === '' || ex.sets == null ? ex.sets : Number(ex.sets),
          reps: ex.reps === '' || ex.reps == null ? ex.reps : Number(ex.reps),
        })),
      }));
      const updated = await updateWorkout(plan.id, normalizedDays);
      setPlan(updated);
      setDays(applyDays(updated?.days || normalizedDays));
      Alert.alert('Saved', 'Workout plan updated.');
    } catch (error) {
      Alert.alert('Could not save', getReadableError(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!plan) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.hdr}>
          <Text style={styles.largeTitle}>Workout</Text>
          <Text style={styles.sub}>Plan your week with guided demos</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No workout yet</Text>
          <Text style={styles.emptyBody}>
            Get a suggested plan with animated demos from 1,300+ exercises.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSuggest}>
            <Text style={styles.primaryText}>Suggest workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => applyStarter(null)}>
            <Text style={styles.ghostText}>Load Push / Pull / Legs</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const activeDay = days[selectedDay] || days[0];
  const exercises = activeDay?.exercises || [];
  const sourceLabel =
    source === 'TRAINER'
      ? 'Trainer plan'
      : source === 'STARTER'
        ? 'Build strength. Look better. Feel stronger.'
        : 'Build strength. Look better. Feel stronger.';

  return (
    <ScreenContainer noPadding>
      <View style={styles.hdr}>
        <View style={{ flex: 1 }}>
          <Text style={styles.largeTitle} numberOfLines={2}>
            {plan.name || 'Workout'}
          </Text>
          <Text style={styles.sub}>{sourceLabel}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.onAccent} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {days.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyBody}>This plan has no days yet.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSuggest}>
              <Text style={styles.primaryText}>Suggest again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabs}
            >
              {days.map((day, index) => {
                const active = selectedDay === index;
                return (
                  <TouchableOpacity
                    key={day.name || index}
                    style={[styles.dayTab, active && styles.dayTabActive]}
                    onPress={() => setSelectedDay(index)}
                  >
                    <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                      {day.name || `Day ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.todayCard}>
              <View style={styles.todayIcon}>
                <Ionicons name="locate" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayLabel}>Today&apos;s focus</Text>
                <Text style={styles.todayName}>
                  {activeDay?.name || `Day ${selectedDay + 1}`}
                  <Text style={styles.todayMeta}> · {exercises.length} exercises</Text>
                </Text>
              </View>
            </View>

            {exercises.map((ex, exIndex) => (
              <View key={`${ex.exerciseId || ex.name}-${exIndex}`} style={styles.item}>
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => setDetailExercise(ex)}
                  activeOpacity={0.85}
                >
                  <ExerciseThumb exercise={ex} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>
                      {ex.catalogName || ex.name || 'Exercise'}
                    </Text>
                    <Text style={styles.exSub}>
                      {[ex.target, ex.equipment].filter(Boolean).join(' · ') ||
                        'Tap for demo & steps'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.label3} />
                </TouchableOpacity>

                <View style={styles.fields}>
                  <NumberStepper
                    label="Sets"
                    value={ex.sets}
                    onChange={(v) => updateExerciseField(selectedDay, exIndex, 'sets', v)}
                  />
                  <NumberStepper
                    label="Reps"
                    value={ex.reps}
                    onChange={(v) => updateExerciseField(selectedDay, exIndex, 'reps', v)}
                  />
                </View>
              </View>
            ))}

            <MediaAttribution style={{ marginTop: 4 }} />
          </>
        )}

        <TouchableOpacity style={styles.linkRow} onPress={handleSuggest}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.linkText}>Suggest a new plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => applyStarter(plan?.id || null)}>
          <Ionicons name="fitness-outline" size={16} color={colors.accent} />
          <Text style={styles.linkText}>Load visual PPL starter</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>

      <ExerciseDetailModal
        visible={!!detailExercise}
        exercise={detailExercise}
        onClose={() => setDetailExercise(null)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: space.pad,
    paddingTop: 52,
    marginBottom: 8,
    gap: 12,
  },
  largeTitle: { ...typography.largeTitle, fontSize: 30 },
  sub: { ...typography.sub, marginTop: 4 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
  content: { paddingHorizontal: space.pad, gap: space.cardGap, paddingBottom: 24 },
  dayTabs: { gap: 8, paddingBottom: 4 },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  dayTabActive: { backgroundColor: colors.accent },
  dayTabText: { fontSize: 14, fontWeight: '600', color: colors.label2 },
  dayTabTextActive: { color: colors.onAccent },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
    borderWidth: 1,
    borderColor: colors.accentLine,
  },
  todayIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.label3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  todayName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.label,
    marginTop: 2,
  },
  todayMeta: { fontWeight: '500', color: colors.label2 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  exSub: {
    fontSize: 12,
    color: colors.label3,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  fields: { flexDirection: 'row', gap: 10 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.label },
  emptyBody: {
    fontSize: 15,
    color: colors.label2,
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginTop: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryText: { color: colors.onAccent, fontWeight: '600', fontSize: 16 },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ghostText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  linkText: { color: colors.accent, fontWeight: '500', fontSize: 15 },
});

export default WorkoutPlanScreen;
