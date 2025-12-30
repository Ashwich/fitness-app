import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', color: '#ef4444' },
  { id: 'weight_gain', label: 'Weight Gain', icon: 'trending-up', color: '#3b82f6' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'barbell', color: '#10b981' },
  { id: 'maintenance', label: 'Maintenance', icon: 'scale-outline', color: '#f59e0b' },
  { id: 'endurance', label: 'Endurance', icon: 'fitness', color: '#8b5cf6' },
  { id: 'strength', label: 'Strength', icon: 'flash', color: '#6b7280' },
];

const ACTIVITY_LEVELS = [
  { 
    id: 'sedentary', 
    label: 'Sedentary', 
    subtitle: 'Little to no exercise',
    backgroundColor: '#dbeafe', // Light blue
    icon: 'home-outline',
  },
  { 
    id: 'lightly_active', 
    label: 'Lightly Active', 
    subtitle: 'Light exercise 1-3 days/week',
    backgroundColor: '#e9d5ff', // Light purple
    icon: 'walk-outline',
  },
  { 
    id: 'moderately_active', 
    label: 'Moderately Active', 
    subtitle: 'Moderate exercise 3-5 days/week',
    backgroundColor: '#fce7f3', // Light pink
    icon: 'fitness-outline',
  },
  { 
    id: 'very_active', 
    label: 'Very Active', 
    subtitle: 'Hard exercise 6-7 days/week',
    backgroundColor: '#ccfbf1', // Light teal/green
    icon: 'flash-outline',
  },
  { 
    id: 'extremely_active', 
    label: 'Extremely Active', 
    subtitle: 'Very hard exercise, physical job',
    backgroundColor: '#fef3c7', // Light yellow
    icon: 'flame-outline',
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [activeField, setActiveField] = useState(null);
  
  const activityListRef = useRef(null);

  const validate = () => {
    const newErrors = {};

    if (!fitnessGoals.primaryGoal) {
      newErrors.primaryGoal = 'Please select a primary fitness goal';
    }

    if (!fitnessGoals.exerciseLevel) {
      newErrors.exerciseLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        fitnessGoals: {
          primaryGoal: fitnessGoals.primaryGoal,
        },
        activityLevel: fitnessGoals.exerciseLevel,
        workoutsPerWeek: parseInt(fitnessGoals.workoutsPerWeek, 10),
        timePerWorkout: fitnessGoals.timePerWorkout,
      };

      await upsertProfile(profileData);
      Alert.alert('Success', 'Fitness goals updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    const fitnessGoalsData = {
      primaryGoal: fitnessGoals.primaryGoal,
      exerciseLevel: fitnessGoals.exerciseLevel,
      workoutsPerWeek: parseInt(fitnessGoals.workoutsPerWeek, 10),
      timePerWorkout: fitnessGoals.timePerWorkout,
    };

    // If in edit mode, save directly
    if (isEditMode) {
      handleSave();
      return;
    }

    // Pass data forward via route params (old app flow)
    navigation.navigate('CalorieGoalsScreen', {
      userProfile: existingProfile,
      personalInfo,
      physicalInfo,
      fitnessGoals: fitnessGoalsData,
    });
  };

  const getActivityLevelIndex = () => {
    const index = ACTIVITY_LEVELS.findIndex(level => level.id === fitnessGoals.exerciseLevel);
    return index >= 0 ? index : 0;
  };

  const handleActivitySelect = (levelId) => {
    setFitnessGoals({ ...fitnessGoals, exerciseLevel: levelId });
    setErrors({ ...errors, exerciseLevel: '' });
  };

  const handlePickerNext = () => {
    setShowActivityPicker(false);
    setActiveField(null);
  };

  const handlePickerClose = () => {
    setShowActivityPicker(false);
    setActiveField(null);
  };

  const renderPickerItem = ({ item }, data, selectedValue, onSelect, listRef) => {
    const isSelected = item.id === selectedValue;
    
    return (
      <TouchableOpacity
        style={[
          styles.pickerItem,
          isSelected && styles.pickerItemSelected,
        ]}
        onPress={() => {
          onSelect(item.id);
          const itemIndex = data.findIndex(l => l.id === item.id);
          if (listRef?.current && itemIndex >= 0) {
            listRef.current.scrollToIndex({
              index: itemIndex,
              animated: true,
            });
          }
        }}
      >
        <Text
          style={[
            styles.pickerItemText,
            isSelected && styles.pickerItemTextSelected,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fitness Goals</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Set Your Goals</Text>
          <Text style={styles.sectionSubtitle}>
            Tell us what you want to achieve
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Primary Fitness Goal *</Text>
            <View style={styles.goalsGrid}>
              {FITNESS_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    fitnessGoals.primaryGoal === goal.id && styles.goalCardSelected,
                    fitnessGoals.primaryGoal === goal.id && {
                      borderColor: goal.color,
                      backgroundColor: `${goal.color}10`,
                    },
                  ]}
                  onPress={() => {
                    setFitnessGoals({ ...fitnessGoals, primaryGoal: goal.id });
                    setErrors({ ...errors, primaryGoal: '' });
                  }}
                >
                  <Ionicons
                    name={goal.icon}
                    size={24}
                    color={fitnessGoals.primaryGoal === goal.id ? goal.color : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.goalLabel,
                      fitnessGoals.primaryGoal === goal.id && {
                        color: goal.color,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.primaryGoal && (
              <Text style={styles.errorText}>{errors.primaryGoal}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Activity Level *</Text>
            <TouchableOpacity
              style={[
                styles.inputField,
                activeField === 'activity' && styles.inputFieldActive,
              ]}
              onPress={() => {
                setActiveField('activity');
                setShowActivityPicker(true);
              }}
            >
              <Text style={styles.inputValue}>
                {fitnessGoals.exerciseLevel 
                  ? ACTIVITY_LEVELS.find(l => l.id === fitnessGoals.exerciseLevel)?.label || 'Select Activity Level'
                  : 'Select Activity Level'}
              </Text>
            </TouchableOpacity>
            {errors.exerciseLevel && (
              <Text style={styles.errorText}>{errors.exerciseLevel}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Workout Frequency</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Days per week</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => {
                      const current = parseInt(fitnessGoals.workoutsPerWeek, 10);
                      if (current > 1) {
                        setFitnessGoals({
                          ...fitnessGoals,
                          workoutsPerWeek: (current - 1).toString(),
                        });
                      }
                    }}
                  >
                    <Ionicons name="remove" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{fitnessGoals.workoutsPerWeek}</Text>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => {
                      const current = parseInt(fitnessGoals.workoutsPerWeek, 10);
                      if (current < 7) {
                        setFitnessGoals({
                          ...fitnessGoals,
                          workoutsPerWeek: (current + 1).toString(),
                        });
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time per workout</Text>
                <View style={styles.durationOptions}>
                  {['20 min', '30 min', '45 min', '60 min', '75 min', '90 min'].map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.durationChip,
                        fitnessGoals.timePerWorkout === duration && styles.durationChipSelected,
                      ]}
                      onPress={() => {
                        setFitnessGoals({ ...fitnessGoals, timePerWorkout: duration });
                      }}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          fitnessGoals.timePerWorkout === duration && styles.durationChipTextSelected,
                        ]}
                      >
                        {duration}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          title={isEditMode ? "Save" : "Continue"} 
          onPress={handleNext} 
          loading={loading} 
        />
      </View>

      {/* Activity Level Picker Bottom Sheet */}
      <Modal
        visible={showActivityPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handlePickerClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handlePickerClose} activeOpacity={1} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <TouchableOpacity onPress={handlePickerClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#9333ea" />
              </TouchableOpacity>
              <Text style={styles.bottomSheetTitle}>Select Activity Level</Text>
              <TouchableOpacity onPress={handlePickerNext} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerSelectionIndicator} />
                </View>
                <FlatList
                  ref={activityListRef}
                  data={ACTIVITY_LEVELS}
                  keyExtractor={(item) => `activity-${item.id}`}
                  renderItem={({ item }) => renderPickerItem(
                    { item },
                    ACTIVITY_LEVELS,
                    fitnessGoals.exerciseLevel,
                    (value) => handleActivitySelect(value),
                    activityListRef
                  )}
                  getItemLayout={(data, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  initialScrollIndex={getActivityLevelIndex()}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContent}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    const selectedValue = ACTIVITY_LEVELS[Math.min(index, ACTIVITY_LEVELS.length - 1)];
                    if (selectedValue) {
                      handleActivitySelect(selectedValue.id);
                    }
                  }}
                  onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                      activityListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.bottomIndicator} />
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  goalCardSelected: {
    borderWidth: 2,
  },
  goalLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  inputField: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputFieldActive: {
    borderColor: '#9333ea',
    borderWidth: 2,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  // Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  nextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333ea',
  },
  pickerContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  pickerWrapper: {
    flex: 1,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  pickerSelectionIndicator: {
    width: '100%',
    height: ITEM_HEIGHT,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  pickerContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  pickerItemText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
  pickerItemTextSelected: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  bottomIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
  },
  numberButton: {
    padding: 8,
  },
  numberValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  durationChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#E8F0FE',
  },
  durationChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  durationChipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default FitnessGoalsScreen;

