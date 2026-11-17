import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile, upsertPreferences } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import { suggestWorkout } from '../../api/services/workoutService';
import { enrichWorkoutDays, STARTER_PLAN_DAYS } from '../../data/exercises';
import { computeAutoGoals } from '../../utils/autoGoals';
import { setWaterGoal } from '../../services/waterIntakeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/opengym';

const ProfileSummaryScreen = ({ navigation, route }) => {
  const userProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};
  const fitnessGoals = route.params?.fitnessGoals || {};
  const calorieGoals = route.params?.calorieGoals || {};
  const autoGoals =
    route.params?.autoGoals ||
    computeAutoGoals({ personalInfo, physicalInfo, fitnessGoals });
  const [saving, setSaving] = useState(false);

  // Combine all data into a single profile object
  const profile = {
    ...userProfile,
    ...personalInfo,
    ...physicalInfo,
    fitnessGoals: {
      primaryGoal: fitnessGoals?.primaryGoal || userProfile?.fitnessGoals?.primaryGoal,
    },
    activityLevel: fitnessGoals?.exerciseLevel || userProfile?.activityLevel,
    workoutsPerWeek: fitnessGoals?.workoutsPerWeek || userProfile?.workoutsPerWeek,
    timePerWorkout: fitnessGoals?.timePerWorkout || userProfile?.timePerWorkout,
    calorieGoals: calorieGoals || userProfile?.calorieGoals,
    stepGoal: autoGoals?.stepGoal,
    waterGoalLiters: autoGoals?.waterGoalLiters,
  };

  const handleCompleteProfile = async () => {
    setSaving(true);
    try {
      const profileData = {
        ...personalInfo,
        weightKg: physicalInfo?.weightKg,
        heightCm: physicalInfo?.heightCm,
        bmi: physicalInfo?.bmi ?? autoGoals?.bmi,
        bmiCategory: physicalInfo?.bmiCategory ?? autoGoals?.bmiCategory,
        fitnessGoals: {
          primaryGoal: fitnessGoals?.primaryGoal,
        },
        goalType: fitnessGoals?.primaryGoal,
        activityLevel: fitnessGoals?.exerciseLevel,
        workoutsPerWeek: fitnessGoals?.workoutsPerWeek,
        timePerWorkout: fitnessGoals?.timePerWorkout,
        calorieGoals: calorieGoals,
      };

      Object.keys(profileData).forEach((key) => {
        if (profileData[key] === null || profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      await upsertProfile(profileData);

      // Steps + water goals
      const stepGoal = autoGoals?.stepGoal || 8000;
      const waterLiters = autoGoals?.waterGoalLiters || 3;
      try {
        await upsertPreferences({
          stepGoal,
          waterGoalMl: Math.round(waterLiters * 1000),
        });
      } catch (e) {
        console.warn('[ProfileSummary] preferences upsert:', e?.message);
      }
      try {
        await setWaterGoal(waterLiters);
      } catch {
        /* ignore */
      }

      let workoutNote = '';
      try {
        const result = await suggestWorkout();
        if (result?.plan) {
          workoutNote = ' A workout plan was suggested for you.';
        } else {
          await AsyncStorage.setItem(
            'fitsera_pending_starter_workout',
            JSON.stringify(enrichWorkoutDays(STARTER_PLAN_DAYS))
          );
          workoutNote = ' A visual Push/Pull/Legs starter was prepared for you.';
        }
      } catch {
        try {
          await AsyncStorage.setItem(
            'fitsera_pending_starter_workout',
            JSON.stringify(enrichWorkoutDays(STARTER_PLAN_DAYS))
          );
          workoutNote = ' A visual Push/Pull/Legs starter was prepared for you.';
        } catch {
          /* ignore */
        }
      }

      Alert.alert(
        'Profile Complete!',
        `Macros, water (${waterLiters}L), and steps (${stepGoal}) are set.${workoutNote}`,
        [
          {
            text: 'View workout',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserDashboard' }],
              });
              setTimeout(() => {
                try {
                  navigation.getParent()?.navigate('Workout');
                } catch {
                  /* ignore */
                }
              }, 400);
            },
          },
          {
            text: 'Go to Dashboard',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserDashboard' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSection = (screenName) => {
    navigation.navigate(screenName, {
      userProfile: userProfile,
      profile: profile,
      personalInfo,
      physicalInfo,
      fitnessGoals,
      calorieGoals,
      isEditing: true,
      editMode: true,
    });
  };

  const getBMIColor = (bmi) => {
    if (!bmi) return colors.label2;
    if (bmi < 18.5) return colors.blue;
    if (bmi < 25) return colors.accent;
    if (bmi < 30) return colors.orange;
    return colors.red;
  };

  const getGoalLabel = (goalId) => {
    const goals = {
      weight_loss: 'Weight Loss',
      weight_gain: 'Weight Gain',
      muscle_gain: 'Muscle Gain',
      maintenance: 'Maintenance',
      endurance: 'Endurance',
      strength: 'Strength',
    };
    return goals[goalId] || goalId;
  };

  const renderInfoCard = (title, children, editScreen) => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {editScreen && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditSection(editScreen)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Welcome, {personalInfo?.fullName?.split(' ')[0] || profile?.fullName?.split(' ')[0] || 'User'}!
          </Text>
          <Text style={styles.welcomeText}>
            Review your information before completing your profile
          </Text>
        </View>

        {renderInfoCard(
          'Personal Information',
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{personalInfo?.fullName || profile?.fullName || 'Not set'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>
                  {personalInfo?.age || profile?.age ? `${personalInfo?.age || profile?.age} years` : 'Not set'}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{personalInfo?.gender || profile?.gender || 'Not set'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{personalInfo?.location || profile?.location || 'Not set'}</Text>
              </View>
            </View>
          </View>,
          'PersonalInfoScreen'
        )}

        {renderInfoCard(
          'Physical Stats',
          <View style={styles.cardContent}>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Weight</Text>
                <Text style={styles.statValue}>
                  {physicalInfo?.originalWeight || physicalInfo?.weightKg || profile?.weightKg
                    ? `${physicalInfo?.originalWeight || physicalInfo?.weightKg || profile?.weightKg} ${physicalInfo?.weightUnit || 'kg'}`
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Height</Text>
                <Text style={styles.statValue}>
                  {physicalInfo?.originalHeight || physicalInfo?.heightCm || profile?.heightCm
                    ? `${physicalInfo?.originalHeight || physicalInfo?.heightCm || profile?.heightCm} ${physicalInfo?.heightUnit || 'cm'}`
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>BMI</Text>
                <Text style={[styles.statValue, { color: getBMIColor(physicalInfo?.bmi || profile?.bmi) }]}>
                  {physicalInfo?.bmi || profile?.bmi ? (physicalInfo?.bmi || profile?.bmi).toFixed(1) : 'N/A'}
                </Text>
                {(physicalInfo?.bmiCategory || profile?.bmiCategory) && (
                  <Text style={styles.statCategory}>{physicalInfo?.bmiCategory || profile?.bmiCategory}</Text>
                )}
              </View>
            </View>
          </View>,
          'PhysicalInfoScreen'
        )}

        {renderInfoCard(
          'Fitness Goals',
          <View style={styles.cardContent}>
            <View style={styles.primaryGoalBox}>
              <Text style={styles.primaryGoalLabel}>Primary Goal</Text>
              <Text style={styles.primaryGoalValue}>
                {fitnessGoals?.primaryGoal || profile?.fitnessGoals?.primaryGoal
                  ? getGoalLabel(fitnessGoals?.primaryGoal || profile?.fitnessGoals?.primaryGoal)
                  : 'Not set'}
              </Text>
            </View>
            <View style={styles.goalDetailsRow}>
              <View style={styles.goalDetail}>
                <Text style={styles.goalDetailLabel}>Activity Level</Text>
                <Text style={styles.goalDetailValue}>
                  {fitnessGoals?.exerciseLevel || profile?.activityLevel
                    ? (fitnessGoals?.exerciseLevel || profile?.activityLevel).charAt(0).toUpperCase() +
                      (fitnessGoals?.exerciseLevel || profile?.activityLevel).slice(1).replace(/_/g, ' ')
                    : '-'}
                </Text>
              </View>
              <View style={styles.goalDetail}>
                <Text style={styles.goalDetailLabel}>Workouts/Week</Text>
                <Text style={styles.goalDetailValue}>
                  {(fitnessGoals?.workoutsPerWeek ?? profile?.workoutsPerWeek) ?? '-'} days
                </Text>
              </View>
              <View style={styles.goalDetail}>
                <Text style={styles.goalDetailLabel}>Duration</Text>
                <Text style={styles.goalDetailValue}>
                  {(fitnessGoals?.timePerWorkout ?? profile?.timePerWorkout) ?? '-'}
                </Text>
              </View>
            </View>
          </View>,
          'FitnessGoalsScreen'
        )}

        {calorieGoals && renderInfoCard(
          'Nutrition Goals',
          <View style={styles.cardContent}>
            <View style={styles.calorieBox}>
              <Text style={styles.calorieLabel}>Daily Target</Text>
              <Text style={styles.calorieValue}>
                {calorieGoals?.dailyCalories || 0}
              </Text>
              <Text style={styles.calorieUnit}>calories</Text>
            </View>

            <View style={styles.macroContainer}>
              <Text style={styles.macroSectionTitle}>Macronutrients</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroBox}>
                  <View style={[styles.macroIndicator, { backgroundColor: colors.red }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>
                    {calorieGoals?.protein || 0}g
                  </Text>
                  <Text style={styles.macroPercent}>
                    {calorieGoals?.dailyCalories
                      ? Math.round(
                          ((calorieGoals?.protein || 0) * 4 /
                            calorieGoals?.dailyCalories) *
                            100
                        )
                      : 0}
                    %
                  </Text>
                </View>
                <View style={styles.macroBox}>
                  <View style={[styles.macroIndicator, { backgroundColor: colors.blue }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>
                    {calorieGoals?.carbs || 0}g
                  </Text>
                  <Text style={styles.macroPercent}>
                    {calorieGoals?.dailyCalories
                      ? Math.round(
                          ((calorieGoals?.carbs || 0) * 4 /
                            calorieGoals?.dailyCalories) *
                            100
                        )
                      : 0}
                    %
                  </Text>
                </View>
                <View style={styles.macroBox}>
                  <View style={[styles.macroIndicator, { backgroundColor: colors.orange }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>
                    {calorieGoals?.fat || 0}g
                  </Text>
                  <Text style={styles.macroPercent}>
                    {calorieGoals?.dailyCalories
                      ? Math.round(
                          ((calorieGoals?.fat || 0) * 9 /
                            calorieGoals?.dailyCalories) *
                            100
                        )
                      : 0}
                    %
                  </Text>
                </View>
              </View>
            </View>
          </View>,
          'CalorieGoalsScreen'
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={saving ? 'Saving...' : 'Complete Profile'}
          onPress={handleCompleteProfile}
          loading={saving}
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.label,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.sep,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.label,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: colors.label2,
    lineHeight: 22,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.sep,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface2,
  },
  editButtonText: {
    fontSize: 14,
    color: colors.label2,
    fontWeight: '500',
  },
  cardContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.label2,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    color: colors.label,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: colors.label2,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.label,
    marginBottom: 4,
  },
  statCategory: {
    fontSize: 12,
    color: colors.label3,
  },
  primaryGoalBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  primaryGoalLabel: {
    fontSize: 13,
    color: colors.label2,
    marginBottom: 8,
  },
  primaryGoalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.label,
  },
  goalDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalDetail: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  goalDetailLabel: {
    fontSize: 11,
    color: colors.label3,
    marginBottom: 6,
    textAlign: 'center',
  },
  goalDetailValue: {
    fontSize: 13,
    color: colors.label,
    fontWeight: '600',
    textAlign: 'center',
  },
  calorieBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  calorieLabel: {
    fontSize: 13,
    color: colors.label2,
    marginBottom: 8,
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.label,
    marginBottom: 4,
  },
  calorieUnit: {
    fontSize: 13,
    color: colors.label3,
  },
  macroContainer: {
    marginTop: 4,
  },
  macroSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.label,
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  macroIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.label2,
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.label,
    marginBottom: 4,
  },
  macroPercent: {
    fontSize: 11,
    color: colors.label3,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.sep,
  },
});

export default ProfileSummaryScreen;


