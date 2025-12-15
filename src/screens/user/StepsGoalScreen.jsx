import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getStepsGoal,
  setStepsGoal,
  getTodaySteps,
  getWeeklySteps,
  startStepTracking,
  stopStepTracking,
} from '../../services/healthService';

const StepsGoalScreen = ({ navigation }) => {
  const [stepsGoal, setStepsGoalState] = useState('10000');
  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklyData, setWeeklyData] = useState({});
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const goal = await getStepsGoal();
      setStepsGoalState(goal.toString());
      
      const steps = await getTodaySteps();
      setTodaySteps(steps);
      
      const weekly = await getWeeklySteps();
      setWeeklyData(weekly);
    } catch (error) {
      console.error('Error loading steps data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    startStepTracking();
    
    // Refresh steps every 5 seconds
    const interval = setInterval(() => {
      getTodaySteps().then(setTodaySteps);
    }, 5000);

    return () => {
      clearInterval(interval);
      stopStepTracking();
    };
  }, [loadData]);

  const handleSaveGoal = async () => {
    const goal = parseInt(stepsGoal, 10);
    if (isNaN(goal) || goal <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid step goal.');
      return;
    }

    setLoading(true);
    try {
      await setStepsGoal(goal);
      Alert.alert('Success', 'Step goal updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save step goal.');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    const goal = parseInt(stepsGoal, 10) || 10000;
    return Math.min((todaySteps / goal) * 100, 100);
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const getTotalWeeklySteps = () => {
    return Object.values(weeklyData).reduce((sum, steps) => sum + steps, 0);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Steps Goal</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Today's Steps</Text>
          <Text style={styles.stepsValue}>{todaySteps.toLocaleString()}</Text>
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
              {getProgressPercentage().toFixed(0)}% of {parseInt(stepsGoal, 10).toLocaleString()} steps
            </Text>
          </View>
        </View>

        {/* Set Goal */}
        <View style={styles.goalCard}>
          <Text style={styles.cardTitle}>Daily Step Goal</Text>
          <FormTextInput
            label="Goal (Steps)"
            placeholder="10000"
            keyboardType="numeric"
            value={stepsGoal}
            onChangeText={setStepsGoalState}
          />
          <PrimaryButton
            title="Save Goal"
            onPress={handleSaveGoal}
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        {/* Weekly Summary */}
        <View style={styles.weeklyCard}>
          <Text style={styles.cardTitle}>Weekly Summary</Text>
          <View style={styles.weeklySummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Steps</Text>
              <Text style={styles.summaryValue}>
                {getTotalWeeklySteps().toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Daily Average</Text>
              <Text style={styles.summaryValue}>
                {Math.round(getTotalWeeklySteps() / 7).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={styles.weeklyProgressCard}>
          <Text style={styles.cardTitle}>Weekly Progress</Text>
          <View style={styles.weeklyGrid}>
            {Object.entries(weeklyData).map(([date, steps]) => (
              <View key={date} style={styles.weeklyItem}>
                <Text style={styles.weeklyDay}>{getDayName(date)}</Text>
                <View style={styles.weeklyBarContainer}>
                  <View
                    style={[
                      styles.weeklyBar,
                      {
                        height: `${Math.min((steps / parseInt(stepsGoal, 10)) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weeklySteps}>{steps.toLocaleString()}</Text>
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
    alignItems: 'center',
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
  stepsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
  weeklySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  weeklyProgressCard: {
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
    backgroundColor: '#10b981',
    borderRadius: 8,
    minHeight: 4,
  },
  weeklySteps: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
});

export default StepsGoalScreen;

