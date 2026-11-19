import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Heading,
  Icon,
  ListCard,
  ListRow,
  Screen,
  Section,
  Segmented,
  Switch,
  TopBar,
  Txt,
} from '../../components/ui';
import { colors } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/services/profileService';
import { deleteAccount } from '../../api/services/authService';
import { getStepsGoal } from '../../services/healthService';
import { areRemindersEnabled, getWaterGoal, setupWaterReminders } from '../../services/waterIntakeService';
import { formatWeight, setUnits, useUnits } from '../../services/unitsService';
import { calorieGoalsOf, fmt, goalLabel, primaryGoalOf } from '../../utils/profileTargets';
import { getReadableError } from '../../utils/apiError';

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth();
  const units = useUnits();
  const [profile, setProfile] = useState(null);
  const [steps, setSteps] = useState(null);
  const [water, setWater] = useState(null);
  const [notif, setNotif] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, s, w, n] = await Promise.all([
          fetchProfile().catch(() => null),
          getStepsGoal().catch(() => null),
          getWaterGoal().catch(() => null),
          areRemindersEnabled().catch(() => false),
        ]);
        setProfile(p);
        setSteps(s);
        setWater(w);
        setNotif(!!n);
      })();
    }, []),
  );

  const toggleNotif = async (on) => {
    setNotif(on);
    try {
      await setupWaterReminders(on, 2);
      if (on && !(await areRemindersEnabled())) {
        setNotif(false);
        Alert.alert('Notifications are off', 'Allow notifications for Fitsera in your phone settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]);
      }
    } catch {
      setNotif(!on);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your Fitsera account, profile, food diary and plans. Your gym keeps its own membership records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await logout();
            } catch (e) {
              setDeleting(false);
              Alert.alert('Could not delete account', getReadableError(e));
            }
          },
        },
      ],
    );

  const kcal = calorieGoalsOf(profile).calories;
  const goal = goalLabel(primaryGoalOf(profile));
  const female = String(profile?.gender || '').toLowerCase() === 'female';

  const metrics = [
    ['Personal details', 'Name, birthday, location', '', () => navigation.navigate('PersonalDetails')],
    ['Body', 'Height, weight, BMI', profile?.weightKg ? formatWeight(Number(profile.weightKg), units) : '', () => navigation.navigate('BodyEdit')],
    ['Fitness plan', 'Goal, activity, routine', goal ? goal.split(' ').pop().replace(/^\w/, (c) => c.toUpperCase()) : '', () => navigation.navigate('PlanEdit')],
    ['Nutrition', 'Calories and macros', kcal ? `${fmt(kcal)} kcal` : '', () => navigation.navigate('CalorieGoalsScreen', { userProfile: profile, isEditing: true, editMode: true })],
    ['Water', 'Daily hydration goal', water ? `${Math.round(water * 100) / 100} L` : '', () => navigation.navigate('Hydration')],
    ['Steps', 'Daily movement goal', steps ? fmt(steps) : '', () => navigation.navigate('Activity')],
  ];
  if (female) {
    metrics.push(['Cycle tracking', 'Period and cycle length', '', () => navigation.navigate('PeriodTrackingScreen')]);
  }

  return (
    <Screen header={<TopBar onBack={() => navigation.goBack()} />}>
      <Heading title="Settings" subtitle="Your numbers shape every target in the app." />

      <Section title="My metrics">
        <ListCard>
          {metrics.map(([title, sub, value, go], i) => (
            <ListRow
              key={title}
              title={title}
              subtitle={sub}
              value={value}
              chevron
              onPress={go}
              last={i === metrics.length - 1}
            />
          ))}
        </ListCard>
      </Section>

      <Section title="App">
        <ListCard>
          <ListRow
            title="Notifications"
            subtitle="Water reminders every 2 hours"
            right={<Switch value={notif} onChange={toggleNotif} label="Notifications" />}
          />
          <ListRow
            title="Units"
            last
            right={
              <Segmented
                inset
                value={units}
                onChange={setUnits}
                options={[
                  { value: 'metric', label: 'Metric' },
                  { value: 'imperial', label: 'Imperial' },
                ]}
              />
            }
          />
        </ListCard>
      </Section>

      <Section title="Account">
        <ListCard>
          <ListRow title="Log out" chevron onPress={logout} />
          <ListRow
            title="Delete account"
            subtitle="Permanently remove your data"
            danger
            last
            onPress={deleting ? undefined : confirmDelete}
            right={deleting ? <ActivityIndicator color={colors.red} /> : null}
          />
        </ListCard>
      </Section>

      <View style={styles.secure}>
        <Icon name="lock" size={16} color={colors.label2} />
        <Txt style={styles.secureText}>Your data is encrypted</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secureText: { fontSize: 13, color: colors.label2 },
});
