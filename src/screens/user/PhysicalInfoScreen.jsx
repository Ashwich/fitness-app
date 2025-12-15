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
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const PhysicalInfoScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};

  // Convert from backend format (weightKg, heightCm) to display format
  const getDisplayWeight = () => {
    if (existingProfile?.weightKg) {
      return existingProfile.weightKg.toString();
    }
    if (existingProfile?.weight) {
      return existingProfile.weight.toString();
    }
    return '';
  };

  const getDisplayHeight = () => {
    if (existingProfile?.heightCm) {
      return existingProfile.heightCm.toString();
    }
    if (existingProfile?.height) {
      return existingProfile.height.toString();
    }
    return '';
  };

  const [formData, setFormData] = useState({
    weight: getDisplayWeight(),
    height: getDisplayHeight(),
    weightUnit: existingProfile?.weightUnit || 'kg',
    heightUnit: existingProfile?.heightUnit || 'cm',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const calculateBMI = (weight, height, weightUnit, heightUnit) => {
    let weightKg = parseFloat(weight);
    let heightM = parseFloat(height);

    // Convert to metric if needed
    if (weightUnit === 'lbs') {
      weightKg = weightKg * 0.453592;
    }
    if (heightUnit === 'ft') {
      heightM = heightM * 0.3048;
    } else if (heightUnit === 'in') {
      heightM = heightM * 0.0254;
    } else if (heightUnit === 'cm') {
      heightM = heightM / 100;
    }

    if (weightKg > 0 && heightM > 0) {
      return weightKg / (heightM * heightM);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
    if (bmi < 25) return { label: 'Normal', color: '#10b981' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
  };

  const validate = () => {
    const newErrors = {};

    const weight = parseFloat(formData.weight);
    if (!formData.weight.trim() || isNaN(weight) || weight <= 0 || weight > 500) {
      newErrors.weight = 'Please enter a valid weight';
    }

    const height = parseFloat(formData.height);
    if (!formData.height.trim() || isNaN(height) || height <= 0 || height > 300) {
      newErrors.height = 'Please enter a valid height';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please enter valid physical information.');
      return;
    }

    let weightKg = parseFloat(formData.weight);
    let heightCm = parseFloat(formData.height);

    // Convert to metric units (backend expects kg and cm)
    if (formData.weightUnit === 'lbs') {
      weightKg = weightKg * 0.453592;
    }
    
    if (formData.heightUnit === 'ft') {
      heightCm = heightCm * 30.48;
    } else if (formData.heightUnit === 'in') {
      heightCm = heightCm * 2.54;
    }
    // If already in cm, no conversion needed

    const bmi = calculateBMI(parseFloat(formData.weight), parseFloat(formData.height), formData.weightUnit, formData.heightUnit);
    const bmiCategory = bmi ? getBMICategory(bmi) : null;

    const physicalInfo = {
      weight: weightKg,
      height: heightCm,
      weightKg: Math.round(weightKg * 10) / 10, // Round to 1 decimal
      heightCm: Math.round(heightCm * 10) / 10, // Round to 1 decimal
      originalWeight: formData.weight,
      originalHeight: formData.height,
      weightUnit: formData.weightUnit,
      heightUnit: formData.heightUnit,
      bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      bmiCategory: bmiCategory?.label || null,
    };

    // Pass data forward via route params (old app flow)
    if (isEditMode) {
      const updatedProfile = {
        ...existingProfile,
        physicalInfo,
      };
      navigation.navigate('FitnessGoalsScreen', {
        userProfile: updatedProfile,
        personalInfo: personalInfo || existingProfile?.personalInfo,
        physicalInfo,
        isEditing: true,
        editMode: true,
      });
    } else {
      navigation.navigate('FitnessGoalsScreen', {
        userProfile: existingProfile,
        personalInfo,
        physicalInfo,
      });
    }
  };

  const bmi = calculateBMI(
    formData.weight,
    formData.height,
    formData.weightUnit,
    formData.heightUnit
  );
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Physical Information</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Your Physical Stats</Text>
          <Text style={styles.sectionSubtitle}>
            Enter your current weight and height to calculate your BMI
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputWithUnit}>
              <FormTextInput
                label="Weight *"
                placeholder="70"
                keyboardType="numeric"
                value={formData.weight}
                onChangeText={(text) => {
                  setFormData({ ...formData, weight: text });
                  setErrors({ ...errors, weight: '' });
                }}
                error={errors.weight}
              />
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitLabel}>Unit</Text>
              <View style={styles.unitOptions}>
                {['kg', 'lbs'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      formData.weightUnit === unit && styles.unitOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, weightUnit: unit })}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        formData.weightUnit === unit && styles.unitOptionTextSelected,
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWithUnit}>
              <FormTextInput
                label="Height *"
                placeholder="175"
                keyboardType="numeric"
                value={formData.height}
                onChangeText={(text) => {
                  setFormData({ ...formData, height: text });
                  setErrors({ ...errors, height: '' });
                }}
                error={errors.height}
              />
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitLabel}>Unit</Text>
              <View style={styles.unitOptions}>
                {['cm', 'ft', 'in'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      formData.heightUnit === unit && styles.unitOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, heightUnit: unit })}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        formData.heightUnit === unit && styles.unitOptionTextSelected,
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {bmi && bmiCategory && (
            <View style={styles.bmiCard}>
              <View style={styles.bmiHeader}>
                <Ionicons name="analytics-outline" size={24} color={bmiCategory.color} />
                <Text style={styles.bmiTitle}>Your BMI</Text>
              </View>
              <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>
                {bmi.toFixed(1)}
              </Text>
              <View style={[styles.bmiBadge, { backgroundColor: `${bmiCategory.color}20` }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiCategory.color }]}>
                  {bmiCategory.label}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={handleNext} loading={false} />
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputWithUnit: {
    flex: 2,
  },
  unitSelector: {
    flex: 1,
    marginTop: 24,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  unitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  unitOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#E8F0FE',
  },
  unitOptionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  unitOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  bmiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bmiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 12,
  },
  bmiBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bmiBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default PhysicalInfoScreen;


