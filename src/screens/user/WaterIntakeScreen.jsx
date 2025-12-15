import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
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

const WaterIntakeScreen = ({ navigation }) => {
  const [waterGoal, setWaterGoalState] = useState('3.0');
  const [todayIntake, setTodayIntake] = useState(0);
  const [weeklyData, setWeeklyData] = useState({});
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveGoal = async () => {
    const goal = parseFloat(waterGoal);
    if (isNaN(goal) || goal <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid water goal in liters.');
      return;
    }

    setLoading(true);
    try {
      await setWaterGoal(goal);
      Alert.alert('Success', 'Water goal updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save water goal.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async (amount) => {
    try {
      const newIntake = await addWaterIntake(amount);
      setTodayIntake(newIntake);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add water intake.');
    }
  };

  const handleToggleReminders = async (value) => {
    setRemindersEnabled(value);
    await setupWaterReminders(value, 2);
    if (value) {
      Alert.alert('Reminders Enabled', 'You will receive reminders to drink water every 2 hours.');
    } else {
      Alert.alert('Reminders Disabled', 'Water intake reminders have been turned off.');
    }
  };

  const getProgressPercentage = () => {
    const goal = parseFloat(waterGoal) || 3.0;
    return Math.min((todayIntake / goal) * 100, 100);
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Intake</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Today's Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getProgressPercentage()}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {todayIntake.toFixed(1)} L / {waterGoal} L
            </Text>
          </View>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddCard}>
          <Text style={styles.cardTitle}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {[0.25, 0.5, 1.0].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAddButton}
                onPress={() => handleAddWater(amount)}
              >
                <Ionicons name="water" size={24} color="#3b82f6" />
                <Text style={styles.quickAddText}>+{amount}L</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Set Goal */}
        <View style={styles.goalCard}>
          <Text style={styles.cardTitle}>Daily Water Goal</Text>
          <FormTextInput
            label="Goal (Liters)"
            placeholder="3.0"
            keyboardType="decimal-pad"
            value={waterGoal}
            onChangeText={setWaterGoalState}
          />
          <PrimaryButton
            title="Save Goal"
            onPress={handleSaveGoal}
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        {/* Reminders */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View>
              <Text style={styles.cardTitle}>Water Reminders</Text>
              <Text style={styles.reminderSubtitle}>
                Get reminded to drink water every 2 hours
              </Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={handleToggleReminders}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={styles.weeklyCard}>
          <Text style={styles.cardTitle}>Weekly Progress</Text>
          <View style={styles.weeklyGrid}>
            {Object.entries(weeklyData).map(([date, amount]) => (
              <View key={date} style={styles.weeklyItem}>
                <Text style={styles.weeklyDay}>{getDayName(date)}</Text>
                <View style={styles.weeklyBarContainer}>
                  <View
                    style={[
                      styles.weeklyBar,
                      {
                        height: `${Math.min((amount / parseFloat(waterGoal)) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weeklyAmount}>{amount.toFixed(1)}L</Text>
              </View>
            ))}
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
    padding: 16,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  quickAddCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButton: {
    marginTop: 12,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  weeklyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    gap: 8,
  },
  weeklyItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  weeklyDay: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  weeklyBarContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBar: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    minHeight: 4,
  },
  weeklyAmount: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
});

export default WaterIntakeScreen;

