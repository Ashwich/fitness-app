import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { fetchPreferences, fetchProfile, upsertPreferences, upsertProfile } from '../../api/services/profileService';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';
import { AppLoader } from '../../components/AppLoader';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await fetchProfile();
      return data ?? null; // Ensure we never return undefined
    },
  });

  const preferencesQuery = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const data = await fetchPreferences();
      return data ?? null; // Ensure we never return undefined
    },
  });

  const [fullName, setFullName] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [notificationsOptIn, setNotificationsOptIn] = useState(true);

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.fullName ?? '');
      setActivityLevel(profileQuery.data.activityLevel ?? '');
      setCity(profileQuery.data.city ?? '');
      setBio(profileQuery.data.bio ?? '');
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (preferencesQuery.data) {
      setWeeklyGoal(
        typeof preferencesQuery.data.weeklyGoalMinutes === 'number'
          ? String(preferencesQuery.data.weeklyGoalMinutes)
          : '',
      );
      setNotificationsOptIn(Boolean(preferencesQuery.data.notificationsOptIn));
    }
  }, [preferencesQuery.data]);

  const profileMutation = useMutation({
    mutationFn: upsertProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Profile saved', 'Your profile information was updated.');
    },
    onError: (error) => Alert.alert('Profile update failed', getReadableError(error)),
  });

  const preferencesMutation = useMutation({
    mutationFn: upsertPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
      Alert.alert('Preferences updated', 'Preferences saved successfully.');
    },
    onError: (error) => Alert.alert('Preferences update failed', getReadableError(error)),
  });

  const handleProfileSave = () => {
    profileMutation.mutate({
      fullName,
      activityLevel: activityLevel || undefined,
      city: city || undefined,
      bio: bio || undefined,
    });
  };

  const handlePreferencesSave = () => {
    preferencesMutation.mutate({
      weeklyGoalMinutes: weeklyGoal ? Number(weeklyGoal) : undefined,
      notificationsOptIn,
    });
  };

  if (profileQuery.isLoading || preferencesQuery.isLoading) {
    return <AppLoader />;
  }

  if (profileQuery.isError || preferencesQuery.isError) {
    return (
      <View style={[styles.container, styles.errorState]}>
        <Text style={styles.errorText}>We were unable to load your profile data.</Text>
        <PrimaryButton
          title="Try again"
          onPress={() => {
            profileQuery.refetch();
            preferencesQuery.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{user?.username}</Text>
      <Text style={styles.subtitle}>Manage your profile and preferences.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile details</Text>
        <FormTextInput label="Full name" value={fullName} onChangeText={setFullName} />
        <FormTextInput
          label="Activity level"
          placeholder="e.g. moderately_active"
          value={activityLevel}
          onChangeText={setActivityLevel}
        />
        <FormTextInput label="City" value={city} onChangeText={setCity} />
        <FormTextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
        <PrimaryButton title="Save profile" onPress={handleProfileSave} loading={profileMutation.isPending} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <FormTextInput
          label="Weekly goal (minutes)"
          keyboardType="numeric"
          value={weeklyGoal}
          onChangeText={setWeeklyGoal}
        />
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Notifications</Text>
            <Text style={styles.switchSubtitle}>Get reminders for check-ins and PT sessions</Text>
          </View>
          <Switch value={notificationsOptIn} onValueChange={setNotificationsOptIn} />
        </View>
        <PrimaryButton
          title="Save preferences"
          onPress={handlePreferencesSave}
          loading={preferencesMutation.isPending}
        />
      </View>

      <PrimaryButton title="Log out" onPress={() => logout()} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    gap: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontWeight: '600',
    color: '#111827',
  },
  switchSubtitle: {
    color: '#6b7280',
    maxWidth: 220,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ProfileScreen;


