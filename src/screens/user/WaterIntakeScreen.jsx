import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  getWaterGoal,
  setWaterGoal,
  getTodayWaterIntake,
  addWaterIntake,
  getWeeklyWaterIntake,
  setupWaterReminders,
  areRemindersEnabled,
} from '../../services/waterIntakeService';

const { width } = Dimensions.get('window');

const WaterIntakeScreen = ({ navigation }) => {
  const [waterGoal, setWaterGoalState] = useState('3.0');
  const [todayIntake, setTodayIntake] = useState(0);
  const [weeklyData, setWeeklyData] = useState({});
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- LOGIC REMAINS UNCHANGED ---
  const loadData = useCallback(async () => {
    try {
      const goal = await getWaterGoal();
      setWaterGoalState(goal.toString());
      const intake = await getTodayWaterIntake();
      setTodayIntake(intake);
      const weekly = await getWeeklyWaterIntake();
      setWeeklyData(weekly);
      const reminders = await areRemindersEnabled();
      setRemindersEnabled(reminders);
    } catch (error) {
      console.error('Error loading water data:', error);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveGoal = async () => {
    const goal = parseFloat(waterGoal);
    if (isNaN(goal) || goal <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid water goal in liters.');
      return;
    }
    setLoading(true);
    try {
      await setWaterGoal(goal);
      Alert.alert('Success', 'Daily goal updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal.');
    } finally { setLoading(false); }
  };

  const handleAddWater = async (amount) => {
    try {
      const newIntake = await addWaterIntake(amount);
      setTodayIntake(newIntake);
      await loadData();
    } catch (error) { Alert.alert('Error', 'Failed to add intake.'); }
  };

  const handleToggleReminders = async (value) => {
    setRemindersEnabled(value);
    await setupWaterReminders(value, 2);
    Alert.alert(value ? 'Reminders On' : 'Reminders Off', 
      value ? 'We will remind you every 2 hours.' : 'Reminders disabled.');
  };

  const getProgressPercentage = () => {
    const goal = parseFloat(waterGoal) || 3.0;
    return Math.min((todayIntake / goal) * 100, 100);
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
  };

  return (
    <ScreenContainer>
      {/* Refined Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close-outline" size={30} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hydration</Text>
        <TouchableOpacity onPress={handleSaveGoal}>
           <Text style={styles.saveActionText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Hydration Circle Display */}
        <View style={styles.heroSection}>
            <View style={styles.intakeDisplay}>
                <Text style={styles.intakeValue}>{todayIntake.toFixed(1)}</Text>
                <Text style={styles.intakeUnit}>Liters Today</Text>
                <View style={styles.progressPill}>
                    <Ionicons name="water" size={14} color="#3b82f6" />
                    <Text style={styles.progressPercent}>{Math.round(getProgressPercentage())}% of goal</Text>
                </View>
            </View>
            
            {/* Visual Wave Bar */}
            <View style={styles.mainProgressBarContainer}>
                <View style={[styles.mainProgressBarFill, { height: `${getProgressPercentage()}%` }]} />
            </View>
        </View>

        {/* Quick Actions Container */}
        <View style={styles.actionGrid}>
            {[0.25, 0.5, 1.0].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.actionButton}
                onPress={() => handleAddWater(amount)}
              >
                <View style={[styles.iconCircle, { backgroundColor: amount >= 1 ? '#3b82f6' : '#dbeafe' }]}>
                    <Ionicons name="add" size={24} color={amount >= 1 ? '#fff' : '#3b82f6'} />
                </View>
                <Text style={styles.actionLabel}>+{amount}L</Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Settings & Goals Card */}
        <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Reminders</Text>
                    <Text style={styles.settingSubtitle}>Every 2 hours</Text>
                </View>
                <Switch
                  value={remindersEnabled}
                  onValueChange={handleToggleReminders}
                  trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Target Goal</Text>
                    <View style={styles.goalInputContainer}>
                         <FormTextInput
                            placeholder="3.0"
                            keyboardType="decimal-pad"
                            value={waterGoal}
                            onChangeText={setWaterGoalState}
                            containerStyle={styles.compactInput}
                        />
                        <Text style={styles.unitText}>Liters/Day</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* Weekly Stats Section */}
        <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Weekly History</Text>
            <View style={styles.chartContainer}>
                {Object.entries(weeklyData).map(([date, amount]) => {
                   const height = Math.min((amount / parseFloat(waterGoal)) * 100, 100);
                   return (
                    <View key={date} style={styles.chartBarWrapper}>
                        <View style={styles.barBackground}>
                            <View style={[styles.barFill, { height: `${height}%`, backgroundColor: height >= 100 ? '#10b981' : '#3b82f6' }]} />
                        </View>
                        <Text style={styles.barLabel}>{getDayName(date)}</Text>
                    </View>
                   );
                })}
            </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  saveActionText: { color: '#3b82f6', fontWeight: '700', fontSize: 16 },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  
  heroSection: {
    height: 280,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginBottom: 24,
    overflow: 'hidden',
  },
  intakeDisplay: { zIndex: 2 },
  intakeValue: { fontSize: 64, fontWeight: '900', color: '#1e293b' },
  intakeUnit: { fontSize: 18, color: '#64748b', marginTop: -8, fontWeight: '500' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  progressPercent: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  
  mainProgressBarContainer: {
    width: 60,
    height: '70%',
    backgroundColor: '#f1f5f9',
    borderRadius: 30,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  mainProgressBarFill: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  settingSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  goalInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  compactInput: { width: 80, marginBottom: 0 },
  unitText: { marginLeft: 10, color: '#64748b', fontWeight: '600' },

  statsContainer: { paddingHorizontal: 24, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  chartBarWrapper: { alignItems: 'center', flex: 1 },
  barBackground: {
    width: 12,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 10 },
  barLabel: { marginTop: 10, fontSize: 12, fontWeight: '700', color: '#94a3b8' },
});

export default WaterIntakeScreen;