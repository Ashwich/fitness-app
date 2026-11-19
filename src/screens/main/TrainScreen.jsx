import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Icon,
  Loading,
  PageTitle,
  Pill,
  RoundButton,
  Screen,
  Segmented,
  Txt,
} from '../../components/ui';
import ExerciseDetailModal from '../../components/workout/ExerciseDetailModal';
import { colors, FONT_FAMILY, radii } from '../../theme/opengym';
import { EXDB, enrichWorkoutDays } from '../../data/exercises';
import { updateWorkout } from '../../api/services/workoutService';
import { markDayActive, todayISO } from '../../services/activityCalendarService';
import { getReadableError } from '../../utils/apiError';
import {
  advanceDay,
  dayTab,
  dayTitle,
  daySubtitle,
  getNextDayIndex,
  loadPlan,
} from './trainState';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const exMeta = (ex) => [cap(ex.target || ex.bodyPart), cap(ex.equipment)].filter(Boolean).join(' · ');
const exName = (ex) => cap(ex.catalogName || ex.name || 'Exercise');

export default function TrainScreen() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [days, setDays] = useState([]);
  const [day, setDay] = useState(0);
  const [nextDay, setNextDay] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null); // { day, done: Set }
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await loadPlan();
    setPlan(res.plan);
    setDays(res.days);
    const n = await getNextDayIndex(res.days.length);
    setNextDay(n);
    setDay((d) => (session ? d : n));
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      if (!editing && !session) load();
    }, [load, editing, session]),
  );

  const current = days[day];
  const exercises = current?.exercises || [];

  const patchExercise = (i, patch) => {
    setDays((prev) => {
      const next = prev.slice();
      const ex = next[day].exercises.slice();
      ex[i] = { ...ex[i], ...patch };
      next[day] = { ...next[day], exercises: ex };
      return next;
    });
    setDirty(true);
  };

  const removeExercise = (i) => {
    setDays((prev) => {
      const next = prev.slice();
      next[day] = { ...next[day], exercises: next[day].exercises.filter((_, k) => k !== i) };
      return next;
    });
    setDirty(true);
  };

  const addExercise = (catalogEx) => {
    const [enriched] = enrichWorkoutDays([{ exercises: [{ id: catalogEx.id, name: catalogEx.n, sets: 3, reps: 10 }] }]);
    setDays((prev) => {
      const next = prev.slice();
      next[day] = { ...next[day], exercises: [...(next[day].exercises || []), enriched.exercises[0]] };
      return next;
    });
    setDirty(true);
    setAdding(false);
  };

  const saveEdits = async () => {
    if (!dirty) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const payload = days.map((d) => ({
      name: d.name,
      exercises: (d.exercises || []).map((e) => ({
        id: e.exerciseId || e.id,
        exerciseId: e.exerciseId || e.id,
        name: e.catalogName || e.name,
        sets: Number(e.sets) || 3,
        reps: Number(e.reps) || 10,
      })),
    }));
    try {
      if (plan?.id) {
        await updateWorkout(plan.id, payload);
      } else {
        await AsyncStorage.setItem('fitsera_pending_starter_workout', JSON.stringify(payload));
      }
      setDirty(false);
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', getReadableError(e));
    } finally {
      setSaving(false);
    }
  };

  const startOrFinish = () => {
    if (!session) {
      setEditing(false);
      setSession({ day, done: new Set() });
      return;
    }
    const doneCount = session.done.size;
    const finish = async () => {
      await markDayActive(todayISO(), 3).catch(() => {});
      await advanceDay(session.day, days.length);
      setNextDay((session.day + 1) % Math.max(1, days.length));
      setSession(null);
      Alert.alert('Workout logged', 'Nice work — today is marked active on your calendar.');
    };
    if (doneCount < exercises.length) {
      Alert.alert(
        'Finish workout?',
        `You've ticked ${doneCount} of ${exercises.length} exercises.`,
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'Finish', onPress: finish },
        ],
      );
    } else {
      finish();
    }
  };

  const toggleDone = (i) => {
    if (!session) return;
    setSession((s) => {
      const done = new Set(s.done);
      if (done.has(i)) done.delete(i);
      else done.add(i);
      return { ...s, done };
    });
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading />
      </Screen>
    );
  }

  const tabs = days.map((d, i) => ({ value: i, label: dayTab(d, i) }));
  const sessionHere = session && session.day === day;

  return (
    <View style={{ flex: 1 }}>
      <Screen contentStyle={{ paddingBottom: 100 }}>
        <PageTitle
          eyebrow={plan?.source === 'TRAINER' ? 'From your trainer' : plan?.name || 'Your plan'}
          title="Train"
          action={
            editing ? (
              <Button title="Done" height={44} style={{ paddingHorizontal: 18, borderRadius: 22 }} loading={saving} onPress={saveEdits} />
            ) : (
              <RoundButton icon="edit" label="Edit program" onPress={() => !session && setEditing(true)} disabled={!!session} />
            )
          }
        />

        {tabs.length > 1 ? (
          <Segmented
            options={tabs}
            value={day}
            onChange={(v) => !session && setDay(v)}
            size="lg"
            stretch
          />
        ) : null}

        <View style={styles.dayHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={styles.dayTitle}>{dayTitle(current, day)}</Txt>
            <Txt style={styles.daySub}>{daySubtitle(current)}</Txt>
          </View>
          {day === nextDay ? <Pill>Today</Pill> : null}
        </View>

        <View style={styles.list}>
          {exercises.length === 0 ? (
            <Txt style={[styles.daySub, { paddingVertical: 18 }]}>No exercises yet — add one below.</Txt>
          ) : null}
          {exercises.map((ex, i) => {
            const done = sessionHere && session.done.has(i);
            return (
              <View key={`${ex.exerciseId || ex.name}-${i}`} style={[styles.item, i < exercises.length - 1 && styles.itemBorder]}>
                <Pressable
                  onPress={() => (sessionHere ? toggleDone(i) : setDetail(ex))}
                  accessibilityRole={sessionHere ? 'checkbox' : 'button'}
                  accessibilityState={sessionHere ? { checked: !!done } : undefined}
                  accessibilityLabel={sessionHere ? `Mark ${exName(ex)} done` : `${exName(ex)} details`}
                  style={[styles.num, done && { backgroundColor: colors.lime }]}
                >
                  {done ? <Icon name="check" size={18} strokeWidth={2.25} /> : <Txt style={styles.numText}>{i + 1}</Txt>}
                </Pressable>
                <Pressable style={{ flex: 1, minWidth: 0, gap: 2 }} onPress={() => setDetail(ex)} accessibilityRole="button">
                  <Txt style={[styles.exName, done && styles.exDone]} numberOfLines={1}>
                    {exName(ex)}
                  </Txt>
                  <Txt style={styles.exMeta} numberOfLines={1}>
                    {exMeta(ex)}
                  </Txt>
                </Pressable>
                {editing ? (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={styles.editRow}>
                      <MiniStep label="sets" value={ex.sets} onChange={(v) => patchExercise(i, { sets: v })} />
                      <Txt style={styles.times}>×</Txt>
                      <MiniStep label="reps" value={ex.reps} onChange={(v) => patchExercise(i, { reps: v })} />
                    </View>
                    <Pressable onPress={() => removeExercise(i)} accessibilityRole="button" hitSlop={8}>
                      <Txt style={styles.remove}>Remove</Txt>
                    </Pressable>
                  </View>
                ) : (
                  <Txt style={styles.setsReps}>
                    {ex.sets}
                    <Txt style={styles.times}> × </Txt>
                    {ex.reps}
                  </Txt>
                )}
              </View>
            );
          })}
        </View>

        {!session ? (
          <Button title="Add exercise" variant="dashed" icon="plus" height={48} onPress={() => setAdding(true)} />
        ) : null}
      </Screen>

      {!editing && exercises.length > 0 ? (
        <View style={styles.cta}>
          <Button
            title={sessionHere ? `Finish workout · ${session.done.size}/${exercises.length}` : 'Start workout'}
            icon={sessionHere ? 'check' : 'play'}
            onPress={() => {
              if (session && !sessionHere) setDay(session.day);
              else startOrFinish();
            }}
          />
        </View>
      ) : null}

      <ExerciseDetailModal visible={!!detail} exercise={detail} onClose={() => setDetail(null)} />
      <AddExerciseModal visible={adding} onClose={() => setAdding(false)} onPick={addExercise} />
    </View>
  );
}

function MiniStep({ value, onChange, label }) {
  const n = Number(value) || 0;
  return (
    <View style={styles.mini}>
      <Pressable accessibilityLabel={`Fewer ${label}`} hitSlop={6} onPress={() => onChange(Math.max(1, n - 1))} style={styles.miniBtn}>
        <Icon name="minus" size={14} strokeWidth={2} />
      </Pressable>
      <Txt style={styles.miniVal}>{n}</Txt>
      <Pressable accessibilityLabel={`More ${label}`} hitSlop={6} onPress={() => onChange(Math.min(50, n + 1))} style={styles.miniBtn}>
        <Icon name="plus" size={14} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function AddExerciseModal({ visible, onClose, onPick }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return EXDB.slice(0, 40);
    return EXDB.filter(
      (e) => e.n.toLowerCase().includes(key) || (e.tg || '').includes(key) || (e.bp || '').includes(key),
    ).slice(0, 60);
  }, [q]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.modalHead}>
          <RoundButton icon="close" label="Close" onPress={onClose} />
          <Txt style={{ fontSize: 16, fontWeight: '600' }}>Add exercise</Txt>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.label2} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search exercises or muscles"
            placeholderTextColor={colors.label3}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => onPick(item)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.result, index < results.length - 1 && styles.itemBorder, pressed && { opacity: 0.6 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={styles.exName}>{cap(item.n)}</Txt>
                <Txt style={styles.exMeta}>{[cap(item.tg), cap(item.eq)].filter(Boolean).join(' · ')}</Txt>
              </View>
              <Icon name="plus" size={18} strokeWidth={2} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dayHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  dayTitle: { fontSize: 20, fontWeight: '600' },
  daySub: { fontSize: 14, color: colors.label2 },
  list: { backgroundColor: colors.surface, borderRadius: radii.card, paddingHorizontal: 18, paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.sep },
  num: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 14, fontWeight: '600' },
  exName: { fontSize: 15, fontWeight: '600' },
  exDone: { color: colors.label3, textDecorationLine: 'line-through' },
  exMeta: { fontSize: 13, color: colors.label2 },
  setsReps: { fontSize: 15, fontWeight: '600' },
  times: { color: colors.label3, fontWeight: '500' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  remove: { fontSize: 12, fontWeight: '600', color: colors.red },
  mini: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 10 },
  miniBtn: { width: 26, height: 30, alignItems: 'center', justifyContent: 'center' },
  miniVal: { minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  cta: { position: 'absolute', left: 20, right: 20, bottom: 16 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.label, fontFamily: FONT_FAMILY },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, backgroundColor: colors.bg },
});
