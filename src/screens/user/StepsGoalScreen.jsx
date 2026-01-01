import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
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

const { width } = Dimensions.get('window');

const StepsGoalScreen = ({ navigation }) => {
  const [stepsGoal, setStepsGoalState] = useState('10000');
  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklyData, setWeeklyData] = useState({});
  const [loading, setLoading] = useState(false);

  // --- LOGIC REMAINS UNCHANGED ---
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
      Alert.alert('Success', 'Goal updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save.');
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
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
  };

  const getTotalWeeklySteps = () => {
    return Object.values(weeklyData).reduce((sum, steps) => sum + steps, 0);
  };

  return (
    <ScreenContainer>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backAction}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Progress Ring Card */}
        <View style={styles.mainCard}>
          <View style={styles.ringContainer}>
             {/* Visual representation of a ring progress */}
            <View style={styles.outerRing}>
                <View style={styles.innerRing}>
                    <Ionicons name="footsteps" size={32} color="#10b981" />
                    <Text style={styles.mainStepsValue}>{todaySteps.toLocaleString()}</Text>
                    <Text style={styles.mainStepsLabel}>Steps Today</Text>
                </View>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressHeader}>
                <Text style={styles.percentageText}>{getProgressPercentage().toFixed(0)}% of goal</Text>
                <Text style={styles.goalTarget}>{parseInt(stepsGoal).toLocaleString()} target</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${getProgressPercentage()}%` }]} />
            </View>
          </View>
        </View>

        {/* Weekly Stats Summary Tiles */}
        <View style={styles.statsRow}>
            <View style={[styles.statTile, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.statLabel}>Weekly Total</Text>
                <Text style={[styles.statValue, { color: '#065F46' }]}>
                    {getTotalWeeklySteps().toLocaleString()}
                </Text>
            </View>
            <View style={[styles.statTile, { backgroundColor: '#F0FDFA' }]}>
                <Text style={styles.statLabel}>Avg. Daily</Text>
                <Text style={[styles.statValue, { color: '#0F766E' }]}>
                    {Math.round(getTotalWeeklySteps() / 7).toLocaleString()}
                </Text>
            </View>
        </View>

        {/* Weekly History Chart */}
        <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Weekly Breakdown</Text>
            <View style={styles.chartArea}>
                {Object.entries(weeklyData).map(([date, steps]) => {
                    const goalNum = parseInt(stepsGoal, 10);
                    const isGoalMet = steps >= goalNum;
                    const height = Math.min((steps / goalNum) * 100, 100);
                    return (
                        <View key={date} style={styles.barWrapper}>
                            <View style={styles.barBackground}>
                                <View style={[
                                    styles.barFill, 
                                    { height: `${height}%`, backgroundColor: isGoalMet ? '#10b981' : '#34d399' }
                                ]} />
                            </View>
                            <Text style={styles.barDay}>{getDayName(date)}</Text>
                        </View>
                    );
                })}
            </View>
        </View>

        {/* Goal Management Section */}
        <View style={styles.goalSection}>
            <Text style={styles.historyTitle}>Adjust Daily Goal</Text>
            <View style={styles.inputContainer}>
                <FormTextInput
                    placeholder="10000"
                    keyboardType="numeric"
                    value={stepsGoal}
                    onChangeText={setStepsGoalState}
                    containerStyle={styles.customInput}
                />
                <PrimaryButton
                    title="Update"
                    onPress={handleSaveGoal}
                    loading={loading}
                    style={styles.updateButton}
                />
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
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  backAction: { width: 40 },
  infoButton: { width: 40, alignItems: 'flex-end' },
  
  content: { flex: 1, backgroundColor: '#F8FAFC' },
  
  mainCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  ringContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 12,
    borderColor: '#F1F5F9', // Background of the ring
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    alignItems: 'center',
  },
  mainStepsValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
  },
  mainStepsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  
  progressBarContainer: { width: '100%' },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentageText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  goalTarget: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  track: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statTile: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    justifyContent: 'center',
  },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 20, fontWeight: '800' },

  historyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 20 },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barWrapper: { alignItems: 'center', flex: 1 },
  barBackground: {
    width: 8,
    height: 80,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  barDay: { marginTop: 12, fontSize: 12, fontWeight: '700', color: '#94A3B8' },

  goalSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInput: { flex: 1, marginBottom: 0 },
  updateButton: {
    height: 54,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
});

export default StepsGoalScreen;