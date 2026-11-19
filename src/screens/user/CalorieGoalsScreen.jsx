import React, { useState, useEffect } from 'react';
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
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import { computeAutoGoals } from '../../utils/autoGoals';
import { colors, radii, space, typography, FONT_FAMILY } from '../../theme/opengym';

const CalorieGoalsScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};
  const physicalInfo = route.params?.physicalInfo || {};
  const fitnessGoals = route.params?.fitnessGoals || {};
  const passedAuto = route.params?.autoGoals;

  const existingCalorieGoals = existingProfile?.calorieGoals || {};

  const seedFromAuto = () => {
    const auto =
      passedAuto ||
      computeAutoGoals({ personalInfo, physicalInfo, fitnessGoals });
    const macros = auto?.calorieGoals;
    if (!macros) return null;
    return {
      dailyCalories: String(macros.dailyCalories),
      protein: String(macros.protein),
      carbs: String(macros.carbs),
      fat: String(macros.fat),
    };
  };

  const [calorieGoals, setCalorieGoals] = useState(() => {
    if (existingCalorieGoals?.dailyCalories) {
      return {
        dailyCalories: existingCalorieGoals.dailyCalories.toString(),
        protein: existingCalorieGoals.protein?.toString() || '',
        carbs: existingCalorieGoals.carbs?.toString() || '',
        fat: existingCalorieGoals.fat?.toString() || '',
      };
    }
    return (
      seedFromAuto() || {
        dailyCalories: '',
        protein: '',
        carbs: '',
        fat: '',
      }
    );
  });

  const [autoGoals, setAutoGoals] = useState(
    () =>
      passedAuto ||
      computeAutoGoals({ personalInfo, physicalInfo, fitnessGoals })
  );
  const [loading, setLoading] = useState(false);

  const handleAutoCalculate = () => {
    const auto = computeAutoGoals({
      personalInfo: {
        age: personalInfo?.age || existingProfile?.age,
        gender: personalInfo?.gender || existingProfile?.gender,
      },
      physicalInfo: {
        weightKg: physicalInfo?.weightKg || existingProfile?.weightKg,
        heightCm: physicalInfo?.heightCm || existingProfile?.heightCm,
      },
      fitnessGoals: {
        primaryGoal:
          fitnessGoals?.primaryGoal || existingProfile?.fitnessGoals?.primaryGoal,
        exerciseLevel:
          fitnessGoals?.exerciseLevel || existingProfile?.activityLevel,
      },
    });
    setAutoGoals(auto);
    if (auto?.calorieGoals) {
      setCalorieGoals({
        dailyCalories: auto.calorieGoals.dailyCalories.toString(),
        protein: auto.calorieGoals.protein.toString(),
        carbs: auto.calorieGoals.carbs.toString(),
        fat: auto.calorieGoals.fat.toString(),
      });
    }
  };

  useEffect(() => {
    if (!calorieGoals.dailyCalories) {
      handleAutoCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const dailyCalories = parseFloat(calorieGoals.dailyCalories);
    if (!calorieGoals.dailyCalories || isNaN(dailyCalories) || dailyCalories < 1000) {
      Alert.alert('Error', 'Minimum goal is 1000 kcal.');
      return false;
    }
    return true;
  };

  const handleSave = async (data) => {
    setLoading(true);
    try {
      await upsertProfile({ calorieGoals: data });
      Alert.alert('Success', 'Goals updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!validate()) return;
    const data = {
      dailyCalories: parseInt(calorieGoals.dailyCalories, 10),
      protein: parseInt(calorieGoals.protein, 10),
      carbs: parseInt(calorieGoals.carbs, 10),
      fat: parseInt(calorieGoals.fat, 10),
    };
    // Only opened from Settings → Nutrition now; always save in place.
    handleSave(data);
  };

  const totalMacroCals =
    parseFloat(calorieGoals.protein || 0) * 4 +
    parseFloat(calorieGoals.carbs || 0) * 4 +
    parseFloat(calorieGoals.fat || 0) * 9;
  const diff = Math.abs(totalMacroCals - parseFloat(calorieGoals.dailyCalories || 0));
  const isMatch =
    parseFloat(calorieGoals.dailyCalories) > 0 &&
    diff < parseFloat(calorieGoals.dailyCalories) * 0.1;

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.label} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <TouchableOpacity onPress={handleAutoCalculate} style={styles.autoBtn}>
          <Text style={styles.autoText}>Auto</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nutrition plan</Text>
        <Text style={styles.subtitle}>Daily energy and macros for your goal.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame" size={18} color={colors.orange} />
            <Text style={styles.cardHeaderText}>Energy target</Text>
          </View>
          <FormTextInput
            label="Daily calories (kcal)"
            placeholder="2000"
            keyboardType="numeric"
            value={calorieGoals.dailyCalories}
            onChangeText={(t) => setCalorieGoals({ ...calorieGoals, dailyCalories: t })}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart" size={18} color={colors.accent} />
            <Text style={styles.cardHeaderText}>Macronutrients</Text>
          </View>
          <View style={styles.macroRow}>
            <View style={styles.macroInputWrap}>
              <FormTextInput
                label="Protein"
                placeholder="150"
                keyboardType="numeric"
                value={calorieGoals.protein}
                onChangeText={(t) => setCalorieGoals({ ...calorieGoals, protein: t })}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.macroInputWrap}>
              <FormTextInput
                label="Carbs"
                placeholder="200"
                keyboardType="numeric"
                value={calorieGoals.carbs}
                onChangeText={(t) => setCalorieGoals({ ...calorieGoals, carbs: t })}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.macroInputWrap}>
              <FormTextInput
                label="Fat"
                placeholder="60"
                keyboardType="numeric"
                value={calorieGoals.fat}
                onChangeText={(t) => setCalorieGoals({ ...calorieGoals, fat: t })}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          <View style={styles.ratioBar}>
            <View
              style={[
                styles.ratioSeg,
                {
                  flex: Math.max(1, parseFloat(calorieGoals.protein) || 0),
                  backgroundColor: colors.blue,
                },
              ]}
            />
            <View
              style={[
                styles.ratioSeg,
                {
                  flex: Math.max(1, parseFloat(calorieGoals.carbs) || 0),
                  backgroundColor: colors.accent,
                  marginHorizontal: 2,
                },
              ]}
            />
            <View
              style={[
                styles.ratioSeg,
                {
                  flex: Math.max(1, parseFloat(calorieGoals.fat) || 0),
                  backgroundColor: colors.orange,
                },
              ]}
            />
          </View>
          <View style={styles.ratioLabels}>
            <Text style={styles.ratioLabel}>Protein</Text>
            <Text style={styles.ratioLabel}>Carbs</Text>
            <Text style={styles.ratioLabel}>Fats</Text>
          </View>
        </View>

        {parseFloat(calorieGoals.dailyCalories) > 0 ? (
          <View style={[styles.summary, isMatch ? styles.summaryOk : styles.summaryWarn]}>
            <Ionicons
              name={isMatch ? 'checkmark-circle' : 'warning'}
              size={22}
              color={isMatch ? colors.accent : colors.orange}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.summaryTitle}>
                {isMatch ? 'Macros balanced' : 'Macro mismatch'}
              </Text>
              <Text style={styles.summaryDetail}>
                Macro sum: {Math.round(totalMacroCals)} kcal
              </Text>
            </View>
            {!isMatch ? (
              <TouchableOpacity onPress={handleAutoCalculate} style={styles.fixBtn}>
                <Text style={styles.fixText}>Fix</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isEditMode ? 'Save changes' : 'Review profile'}
          onPress={handleNext}
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
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface2,
    marginHorizontal: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  autoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
  },
  autoText: { color: colors.accent, fontWeight: '600', fontFamily: FONT_FAMILY, fontSize: 13 },
  content: { flex: 1 },
  scrollPad: { paddingHorizontal: space.pad, paddingBottom: 24 },
  title: { ...typography.largeTitle, marginTop: 8 },
  subtitle: { ...typography.sub, marginTop: 8, marginBottom: 20, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: space.pad,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardHeaderText: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '600', color: colors.label },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroInputWrap: { flex: 1 },
  ratioBar: {
    height: 8,
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: 4,
    marginTop: 18,
    overflow: 'hidden',
  },
  ratioSeg: { height: '100%' },
  ratioLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ratioLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: colors.label3,
    textTransform: 'uppercase',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
  },
  summaryOk: { backgroundColor: colors.accentSoft },
  summaryWarn: { backgroundColor: colors.orangeSoft },
  summaryTitle: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '600', color: colors.label },
  summaryDetail: { fontFamily: FONT_FAMILY, fontSize: 13, color: colors.label2, marginTop: 2 },
  fixBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  fixText: { color: colors.onAccent, fontWeight: '700', fontFamily: FONT_FAMILY, fontSize: 13 },
  footer: {
    padding: space.pad,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
  },
});

export default CalorieGoalsScreen;
