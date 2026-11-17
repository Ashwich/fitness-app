import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { upsertProfile } from '../../api/services/profileService';
import { getReadableError } from '../../utils/apiError';
import { colors, radii, space, typography } from '../../theme/opengym';

const ITEM_HEIGHT = 52;
const PICKER_HEIGHT = 220;
const PAD = Math.floor((PICKER_HEIGHT - ITEM_HEIGHT) / 2);

const cmToFtIn = (cm) => {
  const totalIn = Math.round(Number(cm) / 2.54);
  const feet = Math.floor(totalIn / 12);
  const inches = totalIn % 12;
  return { feet: Math.max(3, Math.min(8, feet)), inches: Math.max(0, Math.min(11, inches)) };
};

const ftInToCm = (feet, inches) =>
  Math.round((Number(feet) * 12 + Number(inches)) * 2.54 * 10) / 10;

const PhysicalInfoScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};

  const initialWeightUnit = existingProfile?.weightUnit || 'kg';
  const initialHeightUnit = existingProfile?.heightUnit === 'ft' ? 'ft' : 'cm';

  const initialWeightKg =
    existingProfile?.weightKg ??
    existingProfile?.weight ??
    (existingProfile?.originalWeight
      ? parseFloat(existingProfile.originalWeight)
      : null);

  let initialWeight = '';
  if (initialWeightKg != null && !Number.isNaN(Number(initialWeightKg))) {
    initialWeight =
      initialWeightUnit === 'lbs'
        ? String(Math.round(Number(initialWeightKg) * 2.20462 * 10) / 10)
        : String(Number(initialWeightKg));
  } else {
    // Seed default so Continue works immediately
    initialWeight = initialWeightUnit === 'lbs' ? '154.0' : '70';
  }

  const initialHeightCm =
    existingProfile?.heightCm ??
    existingProfile?.height ??
    null;

  let initialHeightCmVal = initialHeightCm != null ? Number(initialHeightCm) : 170;
  if (Number.isNaN(initialHeightCmVal) || !initialHeightCmVal) initialHeightCmVal = 170;
  const initialFt = cmToFtIn(initialHeightCmVal);

  const [weight, setWeight] = useState(initialWeight);
  const [weightUnit, setWeightUnit] = useState(initialWeightUnit);
  const [heightUnit, setHeightUnit] = useState(initialHeightUnit);
  const [heightCm, setHeightCm] = useState(String(initialHeightCmVal));
  const [heightFt, setHeightFt] = useState(String(initialFt.feet));
  const [heightIn, setHeightIn] = useState(String(initialFt.inches));
  const [saving, setSaving] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState(null); // 'weight' | 'height'
  const [tempWeight, setTempWeight] = useState('70');
  const [tempWeightUnit, setTempWeightUnit] = useState('kg');
  const [tempHeightUnit, setTempHeightUnit] = useState('cm');
  const [tempCm, setTempCm] = useState('170');
  const [tempFt, setTempFt] = useState('5');
  const [tempIn, setTempIn] = useState('7');

  const scrollRef = useRef(null);
  const ftScrollRef = useRef(null);
  const inScrollRef = useRef(null);

  const weightItems = useMemo(() => {
    const max = tempWeightUnit === 'lbs' ? 440 : 200;
    const min = tempWeightUnit === 'lbs' ? 66 : 30;
    const items = [];
    for (let i = min; i <= max; i += 0.5) items.push(i.toFixed(1));
    return items;
  }, [tempWeightUnit]);

  const cmItems = useMemo(() => {
    const items = [];
    for (let i = 100; i <= 250; i += 1) items.push(String(i));
    return items;
  }, []);

  const ftItems = useMemo(() => ['3', '4', '5', '6', '7', '8'], []);
  const inItems = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i)),
    []
  );

  const displayHeight = () => {
    if (heightUnit === 'ft') {
      if (!heightFt && heightFt !== '0') return '--';
      return `${heightFt}′${heightIn || '0'}″`;
    }
    return heightCm || '--';
  };

  const hasHeight =
    heightUnit === 'ft'
      ? heightFt !== '' && heightIn !== '' && !Number.isNaN(parseFloat(heightFt))
      : heightCm !== '' && !Number.isNaN(parseFloat(heightCm));
  const hasWeight = weight !== '' && !Number.isNaN(parseFloat(weight));
  const canContinue = hasHeight && hasWeight;

  const calculateBMI = () => {
    let weightKg = parseFloat(weight);
    if (!weightKg || weightKg <= 0) return null;
    if (weightUnit === 'lbs') weightKg *= 0.453592;

    let cm;
    if (heightUnit === 'ft') {
      cm = ftInToCm(heightFt, heightIn);
    } else {
      cm = parseFloat(heightCm);
    }
    if (!cm || cm <= 0) return null;
    const m = cm / 100;
    return weightKg / (m * m);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: colors.blue };
    if (bmi < 25) return { label: 'Healthy', color: colors.accent };
    if (bmi < 30) return { label: 'Overweight', color: colors.orange };
    return { label: 'Obese', color: colors.red };
  };

  const scrollToItem = (ref, items, value, animated = false) => {
    const idx = items.indexOf(String(value));
    if (idx < 0 || !ref?.current) return;
    ref.current.scrollTo({ y: idx * ITEM_HEIGHT, animated });
  };

  const openPicker = (type) => {
    setPickerType(type);
    if (type === 'weight') {
      const w = weight || (weightUnit === 'lbs' ? '154.0' : '70.0');
      const normalized = parseFloat(w).toFixed(1);
      setTempWeight(normalized);
      setTempWeightUnit(weightUnit);
    } else {
      setTempHeightUnit(heightUnit);
      if (heightUnit === 'ft') {
        setTempFt(heightFt || '5');
        setTempIn(heightIn || '7');
      } else {
        setTempCm(heightCm || '170');
      }
    }
    setShowPicker(true);
  };

  useEffect(() => {
    if (!showPicker) return;
    const t = setTimeout(() => {
      if (pickerType === 'weight') {
        scrollToItem(scrollRef, weightItems, tempWeight);
      } else if (tempHeightUnit === 'cm') {
        scrollToItem(scrollRef, cmItems, tempCm);
      } else {
        scrollToItem(ftScrollRef, ftItems, tempFt);
        scrollToItem(inScrollRef, inItems, tempIn);
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker, pickerType, tempHeightUnit, tempWeightUnit]);

  const onWheelScroll = (event, items, setter) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const selected = items[Math.max(0, Math.min(items.length - 1, index))];
    if (selected != null) setter(selected);
  };

  const switchHeightUnitInPicker = (unit) => {
    if (unit === tempHeightUnit) return;
    if (unit === 'ft') {
      const { feet, inches } = cmToFtIn(tempCm || 170);
      setTempFt(String(feet));
      setTempIn(String(inches));
    } else {
      setTempCm(String(ftInToCm(tempFt || 5, tempIn || 0)));
    }
    setTempHeightUnit(unit);
  };

  const switchWeightUnitInPicker = (unit) => {
    if (unit === tempWeightUnit) return;
    const val = parseFloat(tempWeight) || 70;
    if (unit === 'lbs') {
      setTempWeight((val * 2.20462).toFixed(1));
    } else {
      setTempWeight((val / 2.20462).toFixed(1));
    }
    setTempWeightUnit(unit);
  };

  const confirmPicker = () => {
    if (pickerType === 'weight') {
      setWeight(tempWeight);
      setWeightUnit(tempWeightUnit);
    } else if (tempHeightUnit === 'ft') {
      setHeightUnit('ft');
      setHeightFt(tempFt);
      setHeightIn(tempIn);
      setHeightCm(String(ftInToCm(tempFt, tempIn)));
    } else {
      setHeightUnit('cm');
      setHeightCm(tempCm);
      const { feet, inches } = cmToFtIn(tempCm);
      setHeightFt(String(feet));
      setHeightIn(String(inches));
    }
    setShowPicker(false);
  };

  const handleNext = useCallback(async () => {
    if (!canContinue) {
      Alert.alert('Missing details', 'Please select both height and weight.');
      return;
    }

    let weightKg = parseFloat(weight);
    if (weightUnit === 'lbs') weightKg *= 0.453592;

    const cm =
      heightUnit === 'ft' ? ftInToCm(heightFt, heightIn) : parseFloat(heightCm);

    if (!weightKg || !cm || Number.isNaN(weightKg) || Number.isNaN(cm)) {
      Alert.alert('Invalid values', 'Please pick valid height and weight.');
      return;
    }

    const bmi = calculateBMI();
    const bmiCategory = bmi ? getBMICategory(bmi) : null;

    const physicalInfoPayload = {
      weight: weightKg,
      height: cm,
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(cm * 10) / 10,
      originalWeight: weight,
      originalHeight:
        heightUnit === 'ft' ? `${heightFt}′${heightIn}″` : heightCm,
      weightUnit,
      heightUnit,
      bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      bmiCategory: bmiCategory?.label || null,
    };

    if (isEditMode) {
      setSaving(true);
      try {
        await upsertProfile({
          weightKg: physicalInfoPayload.weightKg,
          heightCm: physicalInfoPayload.heightCm,
          bmi: physicalInfoPayload.bmi,
          bmiCategory: physicalInfoPayload.bmiCategory,
        });
        Alert.alert('Saved', 'Physical stats updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        Alert.alert('Error', getReadableError(error));
      } finally {
        setSaving(false);
      }
      return;
    }

    navigation.navigate('FitnessGoalsScreen', {
      userProfile: existingProfile,
      personalInfo,
      physicalInfo: physicalInfoPayload,
    });
  }, [
    canContinue,
    weight,
    weightUnit,
    heightUnit,
    heightFt,
    heightIn,
    heightCm,
    isEditMode,
    existingProfile,
    personalInfo,
    navigation,
  ]);

  const bmi = calculateBMI();
  const bmiCat = bmi ? getBMICategory(bmi) : null;

  const renderWheel = (ref, items, value, onChange) => (
    <View style={styles.wheel}>
      <ScrollView
        ref={ref}
        onScroll={(e) => onWheelScroll(e, items, onChange)}
        onMomentumScrollEnd={(e) => onWheelScroll(e, items, onChange)}
        scrollEventThrottle={16}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {items.map((item) => {
          const selected = String(value) === String(item);
          return (
            <View key={item} style={styles.wheelItem}>
              <Text style={[styles.wheelText, selected && styles.wheelTextSelected]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.wheelIndicator} pointerEvents="none" />
    </View>
  );

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.label} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Physical stats</Text>
        <Text style={styles.subtitle}>
          Height and weight power your BMI, calories, and workout suggestions.
        </Text>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[styles.statCard, showPicker && pickerType === 'height' && styles.statCardActive]}
            onPress={() => openPicker('height')}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="resize-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.cardLabel}>Height</Text>
            <Text style={styles.cardValue}>{displayHeight()}</Text>
            <Text style={styles.cardUnit}>{heightUnit === 'ft' ? 'ft / in' : 'cm'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, showPicker && pickerType === 'weight' && styles.statCardActive]}
            onPress={() => openPicker('weight')}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="scale-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.cardLabel}>Weight</Text>
            <Text style={styles.cardValue}>{weight || '--'}</Text>
            <Text style={styles.cardUnit}>{weightUnit}</Text>
          </TouchableOpacity>
        </View>

        {bmi ? (
          <View style={styles.bmiCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bmiLabel}>Body Mass Index</Text>
              <Text style={[styles.bmiStatus, { color: bmiCat.color }]}>{bmiCat.label}</Text>
            </View>
            <Text style={[styles.bmiValue, { color: bmiCat.color }]}>{bmi.toFixed(1)}</Text>
          </View>
        ) : (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.label3} />
            <Text style={styles.hintText}>Tap the cards to set height and weight.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isEditMode ? 'Save' : 'Continue'}
          onPress={handleNext}
          disabled={!canContinue}
          loading={saving}
        />
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={showPicker}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {pickerType === 'weight' ? 'Weight' : 'Height'}
              </Text>
              <TouchableOpacity onPress={confirmPicker} style={styles.doneBtn}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            {pickerType === 'weight' ? (
              <View style={styles.pickerRow}>
                {renderWheel(scrollRef, weightItems, tempWeight, setTempWeight)}
                <View style={styles.unitCol}>
                  {['kg', 'lbs'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => switchWeightUnitInPicker(u)}
                      style={[styles.unitBtn, tempWeightUnit === u && styles.unitBtnActive]}
                    >
                      <Text
                        style={[
                          styles.unitBtnText,
                          tempWeightUnit === u && styles.unitBtnTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.unitToggle}>
                  {['cm', 'ft'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => switchHeightUnitInPicker(u)}
                      style={[styles.toggleBtn, tempHeightUnit === u && styles.toggleBtnActive]}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          tempHeightUnit === u && styles.toggleTextActive,
                        ]}
                      >
                        {u === 'ft' ? 'ft / in' : 'cm'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {tempHeightUnit === 'cm' ? (
                  <View style={styles.pickerRow}>
                    {renderWheel(scrollRef, cmItems, tempCm, setTempCm)}
                    <Text style={styles.unitHint}>cm</Text>
                  </View>
                ) : (
                  <View style={styles.pickerRow}>
                    {renderWheel(ftScrollRef, ftItems, tempFt, setTempFt)}
                    <Text style={styles.ftSep}>ft</Text>
                    {renderWheel(inScrollRef, inItems, tempIn, setTempIn)}
                    <Text style={styles.ftSep}>in</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.pad,
    paddingTop: Platform.OS === 'ios' ? 8 : 40,
    marginBottom: 8,
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
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  scroll: {
    paddingHorizontal: space.pad,
    paddingBottom: 24,
  },
  title: { ...typography.largeTitle, marginTop: 8 },
  subtitle: { ...typography.sub, marginTop: 8, marginBottom: 28, lineHeight: 22 },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    alignItems: 'center',
  },
  statCardActive: {
    backgroundColor: colors.accentSoft,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: { fontSize: 13, color: colors.label3, fontWeight: '500' },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.label,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 12,
    color: colors.label3,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
  },
  bmiLabel: { fontSize: 13, color: colors.label3, fontWeight: '500' },
  bmiStatus: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  bmiValue: { fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
  },
  hintText: { flex: 1, color: colors.label2, fontSize: 14 },
  footer: {
    padding: space.pad,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelText: { color: colors.label2, fontSize: 16 },
  modalTitle: { color: colors.label, fontSize: 17, fontWeight: '600' },
  doneBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  doneText: { color: colors.onAccent, fontWeight: '600', fontSize: 15 },
  unitToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  toggleBtnActive: { backgroundColor: colors.accent },
  toggleText: { color: colors.label2, fontWeight: '600', fontSize: 14 },
  toggleTextActive: { color: colors.onAccent },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: PICKER_HEIGHT,
  },
  wheel: {
    flex: 1,
    height: PICKER_HEIGHT,
    position: 'relative',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: { fontSize: 20, color: colors.label3 },
  wheelTextSelected: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  wheelIndicator: {
    position: 'absolute',
    top: PAD,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  unitCol: {
    width: 72,
    justifyContent: 'center',
    gap: 10,
    paddingLeft: 8,
  },
  unitBtn: {
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: { backgroundColor: colors.accent },
  unitBtnText: { color: colors.label2, fontWeight: '700', fontSize: 14 },
  unitBtnTextActive: { color: colors.onAccent },
  unitHint: {
    width: 40,
    textAlign: 'center',
    color: colors.label2,
    fontWeight: '600',
  },
  ftSep: {
    width: 28,
    textAlign: 'center',
    color: colors.label2,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default PhysicalInfoScreen;
