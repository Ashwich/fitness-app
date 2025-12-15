import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const PersonalInfoScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || false;
  const existingProfile = route.params?.profile || {};

  // Gender mapping: display value -> backend value
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non_binary' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ];

  const [formData, setFormData] = useState({
    fullName: existingProfile?.fullName || '',
    dateOfBirth: existingProfile?.dateOfBirth
      ? new Date(existingProfile.dateOfBirth)
      : new Date(2000, 0, 1),
    gender: existingProfile?.gender || '',
    location: existingProfile?.location || '',
  });

  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    const age = calculateAge(formData.dateOfBirth);
    if (age < 13 || age > 120) {
      newErrors.dateOfBirth = 'Please enter a valid date of birth';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const age = calculateAge(formData.dateOfBirth);
    // Normalize gender to lowercase for backend
    const normalizedGender = formData.gender.toLowerCase();
    
    const personalInfo = {
      fullName: formData.fullName.trim(),
      dateOfBirth: formData.dateOfBirth.toISOString(),
      age,
      gender: normalizedGender,
      location: formData.location.trim(),
    };

    // Pass data forward via route params (old app flow)
    navigation.navigate('PhysicalInfoScreen', {
      userProfile: existingProfile,
      personalInfo,
    });
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);
    try {
      const age = calculateAge(formData.dateOfBirth);
      // Normalize gender to lowercase for backend
      const normalizedGender = formData.gender.toLowerCase();
      
      const profileData = {
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth.toISOString(),
        age,
        gender: normalizedGender,
        location: formData.location.trim(),
      };

      await upsertProfile(profileData);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Personal Info' : 'Personal Information'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.sectionSubtitle}>
            {isEditMode
              ? 'Update your personal information'
              : 'Tell us about yourself to get started'}
          </Text>

          <FormTextInput
            label="Full Name *"
            placeholder="John Doe"
            value={formData.fullName}
            onChangeText={(text) => {
              setFormData({ ...formData, fullName: text });
              setErrors({ ...errors, fullName: '' });
            }}
            error={errors.fullName}
          />

          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, errors.dateOfBirth && styles.errorBorder]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {formatDate(formData.dateOfBirth)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            {errors.dateOfBirth && (
              <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={formData.dateOfBirth}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setFormData({ ...formData, dateOfBirth: selectedDate });
                    setErrors({ ...errors, dateOfBirth: '' });
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
          </View>

          <View style={styles.genderContainer}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderOptions}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    formData.gender === option.value && styles.genderOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, gender: option.value });
                    setErrors({ ...errors, gender: '' });
                  }}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      formData.gender === option.value && styles.genderOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          <FormTextInput
            label="Location *"
            placeholder="City, State"
            value={formData.location}
            onChangeText={(text) => {
              setFormData({ ...formData, location: text });
              setErrors({ ...errors, location: '' });
            }}
            error={errors.location}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isEditMode ? (
          <PrimaryButton title="Save Changes" onPress={handleSave} loading={loading} />
        ) : (
          <PrimaryButton title="Continue" onPress={handleNext} loading={false} />
        )}
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
  datePickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  errorBorder: {
    borderColor: '#ef4444',
  },
  datePickerText: {
    fontSize: 16,
    color: '#111827',
  },
  genderContainer: {
    marginBottom: 20,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#E8F0FE',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  genderOptionTextSelected: {
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

export default PersonalInfoScreen;


