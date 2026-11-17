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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import { savePeriodSettings } from '../../services/periodTrackingService';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, space, typography } from '../../theme/opengym';

const { width } = Dimensions.get('window');

const PersonalInfoScreen = ({ navigation, route }) => {
  const { refreshUser } = useAuth();
  const isEditMode = route.params?.isEditing || false;
  const existingProfile = route.params?.profile || route.params?.userProfile || {};

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
    trackPeriods: existingProfile?.trackPeriods || false,
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
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    const age = calculateAge(formData.dateOfBirth);
    if (age < 13 || age > 120) newErrors.dateOfBirth = 'Please enter a valid date of birth';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPersonalPayload = () => {
    const age = calculateAge(formData.dateOfBirth);
    return {
      fullName: formData.fullName.trim(),
      dateOfBirth: formData.dateOfBirth.toISOString(),
      age,
      gender: formData.gender.toLowerCase(),
      location: formData.location.trim(),
      trackPeriods: formData.gender === 'female' && formData.trackPeriods,
    };
  };

  const handleNext = async () => {
    if (!validate()) return;
    const personalInfo = buildPersonalPayload();
    if (personalInfo.trackPeriods) {
      await savePeriodSettings({ enabled: true });
    }
    // Persist early so mid-flow exit keeps personal details
    setLoading(true);
    try {
      await upsertProfile({
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth,
        age: personalInfo.age,
        gender: personalInfo.gender,
        location: personalInfo.location,
      });
      await refreshUser?.();
    } catch (error) {
      console.warn('[PersonalInfo] early upsert failed:', getReadableError(error));
    } finally {
      setLoading(false);
    }
    navigation.navigate('PhysicalInfoScreen', {
      userProfile: { ...existingProfile, ...personalInfo },
      personalInfo,
    });
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const personalInfo = buildPersonalPayload();
      await upsertProfile({
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth,
        age: personalInfo.age,
        gender: personalInfo.gender,
        location: personalInfo.location,
      });
      if (personalInfo.trackPeriods) {
        await savePeriodSettings({ enabled: true });
      }
      await refreshUser?.();
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.label} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit profile' : 'Step 1 of 4'}
          </Text>
          {!isEditMode ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '25%' }]} />
            </View>
          ) : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Personal details</Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Keep your profile information up to date.'
            : 'Basics we need to personalize your plan.'}
        </Text>

        <View style={styles.card}>
          <FormTextInput
            label="Full name"
            placeholder="Your name"
            value={formData.fullName}
            onChangeText={(text) => {
              setFormData({ ...formData, fullName: text });
              setErrors({ ...errors, fullName: '' });
            }}
            error={errors.fullName}
            containerStyle={styles.field}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <TouchableOpacity
              style={[styles.selector, errors.dateOfBirth && styles.errorBorder]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={styles.selectorText}>{formatDate(formData.dateOfBirth)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.label3} />
            </TouchableOpacity>
            {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderGrid}>
              {genderOptions.map((option) => {
                const selected = formData.gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderChip, selected && styles.genderChipSelected]}
                    onPress={() => {
                      setFormData({ ...formData, gender: option.value });
                      setErrors({ ...errors, gender: '' });
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={selected ? colors.onAccent : colors.label2}
                    />
                    <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          </View>

          {formData.gender === 'female' ? (
            <View style={styles.periodCard}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.periodTitle}>Track periods</Text>
                <Text style={styles.periodSub}>
                  Optional cycle reminders. Stored privately on this device.
                </Text>
              </View>
              <Switch
                value={!!formData.trackPeriods}
                onValueChange={(trackPeriods) => setFormData({ ...formData, trackPeriods })}
                trackColor={{ true: colors.accent, false: colors.surface2 }}
                thumbColor={colors.label}
              />
            </View>
          ) : null}

          <FormTextInput
            label="Location"
            placeholder="City, country"
            value={formData.location}
            onChangeText={(text) => {
              setFormData({ ...formData, location: text });
              setErrors({ ...errors, location: '' });
            }}
            error={errors.location}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        {showDatePicker ? (
          <View style={styles.dateWrap}>
            <DateTimePicker
              value={formData.dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
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
            {Platform.OS === 'ios' ? (
              <TouchableOpacity style={styles.dateDone} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateDoneText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isEditMode ? 'Save changes' : 'Continue'}
          onPress={isEditMode ? handleSave : handleNext}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '600', color: colors.label2 },
  progressTrack: {
    width: 96,
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  content: { flex: 1 },
  scrollPad: { paddingHorizontal: space.pad, paddingBottom: 24 },
  title: { ...typography.largeTitle, marginTop: 8 },
  subtitle: { ...typography.sub, marginTop: 8, marginBottom: 20, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.label3,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectorText: { flex: 1, fontSize: 16, color: colors.label, fontWeight: '500' },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    minWidth: (width - 80) / 2,
    justifyContent: 'center',
  },
  genderChipSelected: { backgroundColor: colors.accent },
  genderText: { fontSize: 14, fontWeight: '600', color: colors.label2 },
  genderTextSelected: { color: colors.onAccent },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 18,
  },
  periodTitle: { fontSize: 15, fontWeight: '600', color: colors.label },
  periodSub: { fontSize: 12, color: colors.label3, marginTop: 4, lineHeight: 16 },
  errorBorder: { borderWidth: 1, borderColor: colors.red },
  errorText: { fontSize: 12, color: colors.red, marginTop: 6 },
  dateWrap: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
  },
  dateDone: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  dateDoneText: { color: colors.onAccent, fontWeight: '600' },
  footer: {
    padding: space.pad,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
  },
});

export default PersonalInfoScreen;
