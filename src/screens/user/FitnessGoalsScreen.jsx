import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import { computeAutoGoals } from '../../utils/autoGoals';
import { colors, radii, space, typography } from '../../theme/opengym';

const { width } = Dimensions.get('window');

const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down' },
  { id: 'weight_gain', label: 'Weight Gain', icon: 'trending-up' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'barbell' },
  { id: 'maintenance', label: 'Maintain', icon: 'scale-outline' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise', icon: 'home-outline' },
  { id: 'lightly_active', label: 'Lightly Active', subtitle: '1–3 days / week', icon: 'walk-outline' },
  {
    id: 'moderately_active',
    label: 'Moderately Active',
    subtitle: '3–5 days / week',
    icon: 'fitness-outline',
  },
  { id: 'very_active', label: 'Very Active', subtitle: 'Daily hard exercise', icon: 'flash-outline' },
];

const FitnessGoalsScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};

  const [fitnessGoals, setFitnessGoals] = useState({
    primaryGoal: existingProfile?.fitnessGoals?.primaryGoal || '',
    exerciseLevel: existingProfile?.activityLevel || existingProfile?.exerciseLevel || '',
    workoutsPerWeek: existingProfile?.workoutsPerWeek?.toString() || '3',
    timePerWorkout: existingProfile?.timePerWorkout?.toString() || '45 min',
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async (data) => {
    setLoading(true);
    try {
      // Match ProfileSummary / backend shape
      await upsertProfile({
        fitnessGoals: { primaryGoal: data.primaryGoal },
        activityLevel: data.exerciseLevel,
        workoutsPerWeek: data.workoutsPerWeek,
        timePerWorkout: data.timePerWorkout,
        goalType: data.primaryGoal,
      });
      Alert.alert('Success', 'Profile Updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!fitnessGoals.primaryGoal || !fitnessGoals.exerciseLevel) {
      Alert.alert('Selection required', 'Please choose your goal and activity level.');
      return;
    }

    const fitnessGoalsData = {
      primaryGoal: fitnessGoals.primaryGoal,
      exerciseLevel: fitnessGoals.exerciseLevel,
      workoutsPerWeek: parseInt(fitnessGoals.workoutsPerWeek, 10),
      timePerWorkout: fitnessGoals.timePerWorkout,
    };

    if (isEditMode) {
      handleSave(fitnessGoalsData);
    } else {
      const autoGoals = computeAutoGoals({
        personalInfo,
        physicalInfo,
        fitnessGoals: fitnessGoalsData,
      });
      navigation.navigate('CalorieGoalsScreen', {
        ...route.params,
        userProfile: existingProfile,
        personalInfo,
        physicalInfo,
        fitnessGoals: fitnessGoalsData,
        autoGoals,
      });
    }
  };

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.label} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '75%' }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Fitness plan</Text>
        <Text style={styles.subtitle}>Goal and activity shape your calories and workouts.</Text>

        <Text style={styles.sectionLabel}>Primary goal</Text>
        <View style={styles.goalsGrid}>
          {FITNESS_GOALS.map((goal) => {
            const selected = fitnessGoals.primaryGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalCard, selected && styles.goalCardSelected]}
                onPress={() => setFitnessGoals({ ...fitnessGoals, primaryGoal: goal.id })}
              >
                <Ionicons
                  name={goal.icon}
                  size={22}
                  color={selected ? colors.accent : colors.label3}
                />
                <Text style={[styles.goalText, selected && styles.goalTextSelected]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Activity level</Text>
        {ACTIVITY_LEVELS.map((level) => {
          const selected = fitnessGoals.exerciseLevel === level.id;
          return (
            <TouchableOpacity
              key={level.id}
              style={[styles.activityCard, selected && styles.activityCardSelected]}
              onPress={() => setFitnessGoals({ ...fitnessGoals, exerciseLevel: level.id })}
            >
              <View style={[styles.activityIcon, selected && styles.activityIconSelected]}>
                <Ionicons
                  name={level.icon}
                  size={20}
                  color={selected ? colors.onAccent : colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityLabel}>{level.label}</Text>
                <Text style={styles.activitySub}>{level.subtitle}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionLabel}>Routine</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Workouts / week</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() =>
                  setFitnessGoals({
                    ...fitnessGoals,
                    workoutsPerWeek: Math.max(1, parseInt(fitnessGoals.workoutsPerWeek, 10) - 1).toString(),
                  })
                }
              >
                <Ionicons name="remove-circle" size={28} color={colors.accent} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{fitnessGoals.workoutsPerWeek}</Text>
              <TouchableOpacity
                onPress={() =>
                  setFitnessGoals({
                    ...fitnessGoals,
                    workoutsPerWeek: Math.min(7, parseInt(fitnessGoals.workoutsPerWeek, 10) + 1).toString(),
                  })
                }
              >
                <Ionicons name="add-circle" size={28} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.detailText}>Avg. duration</Text>
          <View style={styles.chipRow}>
            {['30 min', '45 min', '60 min', '90 min'].map((d) => {
              const selected = fitnessGoals.timePerWorkout === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setFitnessGoals({ ...fitnessGoals, timePerWorkout: d })}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isEditMode ? 'Update profile' : 'Continue'}
          onPress={handleNext}
          loading={loading}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.pad,
    paddingTop: Platform.OS === 'ios' ? 8 : 40,
    marginBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface2,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  content: { flex: 1 },
  scrollPad: { paddingHorizontal: space.pad, paddingBottom: 24 },
  title: { ...typography.largeTitle, marginTop: 8 },
  subtitle: { ...typography.sub, marginTop: 8, marginBottom: 22, lineHeight: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.label3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 8,
  },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  goalCard: {
    width: (width - 42) / 2,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  goalCardSelected: { backgroundColor: colors.accentSoft },
  goalText: { marginTop: 8, fontSize: 14, color: colors.label2, fontWeight: '500' },
  goalTextSelected: { color: colors.accent, fontWeight: '600' },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    marginBottom: 10,
    gap: 12,
  },
  activityCardSelected: { backgroundColor: colors.accentSoft },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconSelected: { backgroundColor: colors.accent },
  activityLabel: { fontSize: 16, fontWeight: '600', color: colors.label },
  activitySub: { fontSize: 13, color: colors.label3, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: { fontSize: 15, fontWeight: '600', color: colors.label },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.label,
    minWidth: 20,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.sep,
    marginVertical: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.label2 },
  chipTextActive: { color: colors.onAccent },
  footer: {
    padding: space.pad,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
  },
});

export default FitnessGoalsScreen;
