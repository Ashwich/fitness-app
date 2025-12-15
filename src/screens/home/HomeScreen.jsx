import { useQuery } from '@tanstack/react-query';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { fetchPreferences, fetchProfile } from '../../api/services/profileService';
import { AppLoader } from '../../components/AppLoader';

const HomeScreen = () => {
  const { user, refreshUser } = useAuth();

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

  const onRefresh = async () => {
    try {
      await Promise.all([profileQuery.refetch(), preferencesQuery.refetch(), refreshUser()]);
    } catch (error) {
      Alert.alert('Refresh failed', 'Could not refresh latest data.');
    }
  };

  if (profileQuery.isLoading || preferencesQuery.isLoading) {
    return <AppLoader />;
  }

  if (profileQuery.isError || preferencesQuery.isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>We could not load your data right now.</Text>
        <PrimaryButton title="Try again" onPress={onRefresh} loading={profileQuery.isFetching} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={profileQuery.isRefetching || preferencesQuery.isRefetching} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.username}</Text>
        <Text style={styles.subtitle}>Here is a quick snapshot of your fitness profile.</Text>
      </View>

      <InfoCard title="Contact">
        <Text style={styles.value}>{user?.email ?? 'Email not added'}</Text>
        <Text style={styles.value}>{user?.phone ?? 'Phone not added'}</Text>
      </InfoCard>

      <InfoCard title="Profile Insights">
        <Text style={styles.value}>
          {profileQuery.data?.fullName ?? 'Complete your profile to personalize recommendations.'}
        </Text>
        <Text style={styles.value}>
          Activity level: {profileQuery.data?.activityLevel ?? 'Not provided'}
        </Text>
      </InfoCard>

      <InfoCard title="Weekly Goal">
        <Text style={styles.highlight}>
          {preferencesQuery.data?.weeklyGoalMinutes
            ? `${preferencesQuery.data?.weeklyGoalMinutes} min`
            : 'Set a weekly target to stay accountable'}
        </Text>
        <Text style={styles.value}>
          Notifications: {preferencesQuery.data?.notificationsOptIn ? 'Enabled' : 'Disabled'}
        </Text>
      </InfoCard>

      <PrimaryButton title="Refresh data" onPress={onRefresh} loading={profileQuery.isFetching} />
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
    gap: 16,
  },
  header: {
    gap: 6,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
  },
  value: {
    color: '#374151',
  },
  highlight: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default HomeScreen;


