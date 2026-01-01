import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const { width } = Dimensions.get('window');

const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', color: '#ef4444' },
  { id: 'weight_gain', label: 'Weight Gain', icon: 'trending-up', color: '#3b82f6' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'barbell', color: '#10b981' },
  { id: 'maintenance', label: 'Maintain', icon: 'scale-outline', color: '#f59e0b' },
];

const ACTIVITY_LEVELS = [
  { 
    id: 'sedentary', 
    label: 'Sedentary', 
    subtitle: 'Little to no exercise',
    backgroundColor: '#E0F2FE', // Blue tint
    icon: 'home',
    iconColor: '#0ea5e9'
  },
  { 
    id: 'lightly_active', 
    label: 'Lightly Active', 
    subtitle: '1-3 days / week',
    backgroundColor: '#F3E8FF', // Purple tint
    icon: 'walk',
    iconColor: '#a855f7'
  },
  { 
    id: 'moderately_active', 
    label: 'Moderately Active', 
    subtitle: '3-5 days / week',
    backgroundColor: '#FCE7F3', // Pink tint
    icon: 'fitness',
    iconColor: '#ec4899'
  },
  { 
    id: 'very_active', 
    label: 'Very Active', 
    subtitle: 'Daily hard exercise',
    backgroundColor: '#DCFCE7', // Green tint
    icon: 'flash',
    iconColor: '#22c55e'
  },
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

  const handleNext = () => {
    if (!fitnessGoals.primaryGoal || !fitnessGoals.exerciseLevel) {
      Alert.alert('Selection Required', 'Please choose your goal and activity level.');
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
      navigation.navigate('CalorieGoalsScreen', {
        ...route.params,
        fitnessGoals: fitnessGoalsData,
      });
    }
  };

  const handleSave = async (data) => {
    setLoading(true);
    try {
      await upsertProfile(data);
      Alert.alert('Success', 'Profile Updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close-outline" size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepDot} />
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
            <Text style={styles.title}>Your Fitness Plan</Text>
            <Text style={styles.subtitle}>Define your path to a healthier you.</Text>
        </View>

        {/* Primary Goal Selection - Compact Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Primary Goal</Text>
          <View style={styles.goalsGrid}>
            {FITNESS_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  fitnessGoals.primaryGoal === goal.id && { borderColor: goal.color, backgroundColor: `${goal.color}08` }
                ]}
                onPress={() => setFitnessGoals({ ...fitnessGoals, primaryGoal: goal.id })}
              >
                <Ionicons name={goal.icon} size={22} color={fitnessGoals.primaryGoal === goal.id ? goal.color : '#94a3b8'} />
                <Text style={[styles.goalText, fitnessGoals.primaryGoal === goal.id && { color: goal.color, fontWeight: '700' }]}>
                    {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Level - The requested design match */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity Level</Text>
          {ACTIVITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.activityCard,
                { backgroundColor: level.backgroundColor },
                fitnessGoals.exerciseLevel === level.id && styles.activityCardSelected
              ]}
              onPress={() => setFitnessGoals({ ...fitnessGoals, exerciseLevel: level.id })}
            >
              <View style={styles.activityIconContainer}>
                <Ionicons name={level.icon} size={24} color={level.iconColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityLabel}>{level.label}</Text>
                <Text style={styles.activitySubtitle}>{level.subtitle}</Text>
              </View>
              <View style={styles.selectionCircle}>
                {fitnessGoals.exerciseLevel === level.id && (
                  <View style={[styles.selectionInner, { backgroundColor: level.iconColor }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequency & Duration */}
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>Routine Details</Text>
            <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailText}>Workouts per week</Text>
                    <View style={styles.counter}>
                        <TouchableOpacity onPress={() => setFitnessGoals({...fitnessGoals, workoutsPerWeek: Math.max(1, parseInt(fitnessGoals.workoutsPerWeek)-1).toString()})}>
                            <Ionicons name="remove-circle-outline" size={24} color="#6366f1" />
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{fitnessGoals.workoutsPerWeek}</Text>
                        <TouchableOpacity onPress={() => setFitnessGoals({...fitnessGoals, workoutsPerWeek: Math.min(7, parseInt(fitnessGoals.workoutsPerWeek)+1).toString()})}>
                            <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 15, paddingTop: 15 }]}>
                    <Text style={styles.detailText}>Avg. duration</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['30 min', '45 min', '60 min', '90 min'].map(d => (
                            <TouchableOpacity 
                                key={d} 
                                style={[styles.chip, fitnessGoals.timePerWorkout === d && styles.chipActive]}
                                onPress={() => setFitnessGoals({...fitnessGoals, timePerWorkout: d})}
                            >
                                <Text style={[styles.chipText, fitnessGoals.timePerWorkout === d && styles.chipTextActive]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          title={isEditMode ? "Update Profile" : "Next Step"} 
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
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  stepActive: { width: 20, backgroundColor: '#6366f1' },
  
  content: { flex: 1, backgroundColor: '#fff' },
  topSection: { padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },

  section: { paddingHorizontal: 24, marginBottom: 30 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  goalText: { marginTop: 8, fontSize: 14, color: '#475569', fontWeight: '500' },

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  },
  activityCardSelected: { borderWidth: 2, borderColor: '#6366f1' },
  activityIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1, marginLeft: 16 },
  activityLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  activitySubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  
  selectionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  selectionInner: { width: 12, height: 12, borderRadius: 6 },

  detailsCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterValue: { fontSize: 18, fontWeight: '800', color: '#1e293b', minWidth: 20, textAlign: 'center' },

  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },

  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
});

export default FitnessGoalsScreen;