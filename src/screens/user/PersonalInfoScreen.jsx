import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';

const { width } = Dimensions.get('window');

const PersonalInfoScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || false;
  const existingProfile = route.params?.profile || {};

  const genderOptions = [
    { label: 'Male', value: 'male', icon: 'male' },
    { label: 'Female', value: 'female', icon: 'female' },
    { label: 'Other', value: 'non_binary', icon: 'male-female' },
    { label: 'Hide', value: 'prefer_not_to_say', icon: 'eye-off' },
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

  // --- LOGIC REMAINS UNCHANGED ---
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
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    const age = calculateAge(formData.dateOfBirth);
    if (age < 13 || age > 120) newErrors.dateOfBirth = 'Please enter a valid date of birth';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const age = calculateAge(formData.dateOfBirth);
    const personalInfo = {
      fullName: formData.fullName.trim(),
      dateOfBirth: formData.dateOfBirth.toISOString(),
      age,
      gender: formData.gender.toLowerCase(),
      location: formData.location.trim(),
    };
    navigation.navigate('PhysicalInfoScreen', { userProfile: existingProfile, personalInfo });
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const age = calculateAge(formData.dateOfBirth);
      const profileData = {
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth.toISOString(),
        age,
        gender: formData.gender.toLowerCase(),
        location: formData.location.trim(),
      };
      await upsertProfile(profileData);
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <ScreenContainer>
      {/* Redesigned Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Profile' : 'Step 1 of 3'}
          </Text>
          {!isEditMode && <View style={styles.progressBar}><View style={styles.progressFill} /></View>}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.introSection}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <Text style={styles.sectionSubtitle}>
            {isEditMode ? 'Keep your profile information up to date.' : 'Let’s start with the basics to personalize your experience.'}
          </Text>
        </View>

        <View style={styles.card}>
          {/* Full Name Input */}
          <View style={styles.inputWrapper}>
             <FormTextInput
                label="FULL NAME"
                placeholder="John Doe"
                value={formData.fullName}
                onChangeText={(text) => {
                    setFormData({ ...formData, fullName: text });
                    setErrors({ ...errors, fullName: '' });
                }}
                error={errors.fullName}
                containerStyle={styles.customInput}
              />
          </View>

          {/* Date of Birth Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
            <TouchableOpacity
              style={[styles.selectorButton, errors.dateOfBirth && styles.errorBorder]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectorLeft}>
                <Ionicons name="calendar-clear-outline" size={20} color="#10b981" style={styles.inputIcon} />
                <Text style={styles.selectorText}>{formatDate(formData.dateOfBirth)}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
          </View>

          {/* Gender Selection Chips */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>GENDER</Text>
            <View style={styles.genderGrid}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderChip,
                    formData.gender === option.value && styles.genderChipSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, gender: option.value });
                    setErrors({ ...errors, gender: '' });
                  }}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={18} 
                    color={formData.gender === option.value ? '#ffffff' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.genderChipText,
                    formData.gender === option.value && styles.genderChipTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          {/* Location Input */}
          <View style={styles.inputWrapper}>
              <FormTextInput
                label="LOCATION"
                placeholder="New York, USA"
                value={formData.location}
                onChangeText={(text) => {
                    setFormData({ ...formData, location: text });
                    setErrors({ ...errors, location: '' });
                }}
                error={errors.location}
                containerStyle={styles.customInput}
              />
          </View>
        </View>

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
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          title={isEditMode ? "Save Changes" : "Continue"} 
          onPress={isEditMode ? handleSave : handleNext} 
          loading={loading}
          style={styles.mainButton}
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: '#10b981',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1, backgroundColor: '#fcfdfd' },
  scrollPadding: { paddingBottom: 40 },
  introSection: { paddingHorizontal: 24, paddingVertical: 20 },
  sectionTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sectionSubtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22 },
  
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
    marginBottom: 10,
    letterSpacing: 1,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { marginRight: 12 },
  selectorText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    minWidth: (width - 120) / 2,
    justifyContent: 'center',
    gap: 8,
  },
  genderChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  genderChipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  genderChipTextSelected: { color: '#ffffff' },

  errorBorder: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 },
  
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mainButton: {
    borderRadius: 18,
    height: 56,
  },
  customInput: {
      marginBottom: 0, // Handled by inputContainer spacing
  }
});

export default PersonalInfoScreen;