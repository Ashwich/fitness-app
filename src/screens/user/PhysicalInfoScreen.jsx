import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const ITEM_HEIGHT = 60; // Increased for better touch targets

const PhysicalInfoScreen = ({ navigation, route }) => {
  const isEditMode = route.params?.isEditing || route.params?.editMode || false;
  const existingProfile = route.params?.userProfile || {};
  const personalInfo = route.params?.personalInfo || {};

  const getDisplayWeight = () => {
    if (existingProfile?.weightKg) return existingProfile.weightKg.toString();
    if (existingProfile?.weight) return existingProfile.weight.toString();
    return '';
  };

  const getDisplayHeight = () => {
    if (existingProfile?.heightCm) return existingProfile.heightCm.toString();
    if (existingProfile?.height) return existingProfile.height.toString();
    return '';
  };

  const [formData, setFormData] = useState({
    weight: getDisplayWeight(),
    height: getDisplayHeight(),
    weightUnit: existingProfile?.weightUnit || 'kg',
    heightUnit: existingProfile?.heightUnit || 'cm',
  });

  const [errors, setErrors] = useState({});
  const [loading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState(null); 
  const [pickerValue, setPickerValue] = useState('');
  const [pickerUnit, setPickerUnit] = useState('');

  const scrollViewRef = useRef(null);

  const calculateBMI = (weight, height, weightUnit, heightUnit) => {
    let weightKg = parseFloat(weight);
    let heightM = parseFloat(height);
    if (weightUnit === 'lbs') weightKg *= 0.453592;
    if (heightUnit === 'ft') heightM *= 0.3048;
    else if (heightUnit === 'in') heightM *= 0.0254;
    else if (heightUnit === 'cm') heightM /= 100;

    if (weightKg > 0 && heightM > 0) return weightKg / (heightM * heightM);
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#60A5FA' };
    if (bmi < 25) return { label: 'Healthy', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  };

  const handleOpenPicker = (type) => {
    setPickerType(type);
    if (type === 'weight') {
      setPickerValue(formData.weight || '70');
      setPickerUnit(formData.weightUnit);
    } else {
      setPickerValue(formData.height || '170');
      setPickerUnit(formData.heightUnit);
    }
    setShowPicker(true);
  };

  const handlePickerConfirm = () => {
    if (pickerType === 'weight') {
      setFormData((prev) => ({ ...prev, weight: pickerValue, weightUnit: pickerUnit }));
      setErrors((prev) => ({ ...prev, weight: '' }));
    } else {
      setFormData((prev) => ({ ...prev, height: pickerValue, heightUnit: pickerUnit }));
      setErrors((prev) => ({ ...prev, height: '' }));
    }
    setShowPicker(false);
  };

  const generatePickerItems = (type) => {
    const items = [];
    const range = type === 'weight' ? [30, 200] : [100, 250];
    for (let i = range[0]; i <= range[1]; i += 0.5) items.push(i.toFixed(1));
    return items;
  };

  const pickerItems = generatePickerItems(pickerType);

  const scrollToValue = (value) => {
    const index = pickerItems.indexOf(value);
    if (index !== -1 && scrollViewRef.current) {
      const offset = index * ITEM_HEIGHT - (250 / 2 - ITEM_HEIGHT / 2);
      scrollViewRef.current.scrollTo({ y: offset, animated: false });
    }
  };

  useEffect(() => {
    if (showPicker && pickerValue && pickerItems.length > 0) {
      setTimeout(() => scrollToValue(pickerValue), 100);
    }
  }, [showPicker, pickerType]);

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const selected = pickerItems[index];
    if (selected && selected !== pickerValue) setPickerValue(selected);
  };

  const handleNext = () => {
    const weightVal = parseFloat(formData.weight);
    const heightVal = parseFloat(formData.height);

    if (!formData.weight || isNaN(weightVal) || !formData.height || isNaN(heightVal)) {
      Alert.alert('Validation Error', 'Please select both height and weight.');
      return;
    }

    let weightKg = weightVal;
    let heightCm = heightVal;
    if (formData.weightUnit === 'lbs') weightKg *= 0.453592;
    if (formData.heightUnit === 'ft') heightCm *= 30.48;
    else if (formData.heightUnit === 'in') heightCm *= 2.54;

    const bmi = calculateBMI(weightVal, heightVal, formData.weightUnit, formData.heightUnit);
    const bmiCategory = bmi ? getBMICategory(bmi) : null;

    const physicalInfo = {
      weight: weightKg,
      height: heightCm,
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(heightCm * 10) / 10,
      originalWeight: formData.weight,
      originalHeight: formData.height,
      weightUnit: formData.weightUnit,
      heightUnit: formData.heightUnit,
      bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      bmiCategory: bmiCategory?.label || null,
    };

    const targetScreen = 'FitnessGoalsScreen';
    const params = isEditMode 
      ? { userProfile: { ...existingProfile, physicalInfo }, personalInfo: personalInfo || existingProfile?.personalInfo, physicalInfo, isEditing: true, editMode: true }
      : { userProfile: existingProfile, personalInfo, physicalInfo };

    navigation.navigate(targetScreen, params);
  };

  const bmi = calculateBMI(formData.weight, formData.height, formData.weightUnit, formData.heightUnit);
  const bmiCat = bmi ? getBMICategory(bmi) : null;

  return (
    <ScreenContainer noPadding={true} style={{backgroundColor: '#fff'}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, {width: '66%'}]} />
        </View>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Physical Stats</Text>
        <Text style={styles.subtitle}>These details help us customize your fitness plan and daily caloric needs.</Text>

        <View style={styles.cardsRow}>
            <TouchableOpacity 
                style={[styles.statCard, pickerType === 'height' && showPicker && styles.activeCard]}
                onPress={() => handleOpenPicker('height')}
            >
                <View style={styles.cardIconCircle}>
                    <Ionicons name="resize" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.cardLabel}>Height</Text>
                <Text style={styles.cardValue}>{formData.height || '--'}</Text>
                <Text style={styles.cardUnit}>{formData.heightUnit}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.statCard, pickerType === 'weight' && showPicker && styles.activeCard]}
                onPress={() => handleOpenPicker('weight')}
            >
                <View style={styles.cardIconCircle}>
                    <Ionicons name="speedometer-outline" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.cardLabel}>Weight</Text>
                <Text style={styles.cardValue}>{formData.weight || '--'}</Text>
                <Text style={styles.cardUnit}>{formData.weightUnit}</Text>
            </TouchableOpacity>
        </View>

        {bmi && (
          <View style={[styles.bmiSection, { borderColor: bmiCat.color + '40' }]}>
            <View>
                <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
                <Text style={[styles.bmiStatus, { color: bmiCat.color }]}>{bmiCat.label}</Text>
            </View>
            <Text style={[styles.bmiBigValue, { color: bmiCat.color }]}>{bmi.toFixed(1)}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
            title="Continue" 
            onPress={handleNext} 
            disabled={!formData.weight || !formData.height}
        />
      </View>

      <Modal animationType="fade" transparent visible={showPicker} onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {pickerType}</Text>
              <TouchableOpacity onPress={handlePickerConfirm} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Set Value</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerWrapper}>
              <View style={styles.pickerMain}>
                  <ScrollView
                    ref={scrollViewRef}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 100 }}
                  >
                    {pickerItems.map((item, idx) => {
                      const isSelected = pickerValue === item;
                      return (
                        <View key={idx} style={styles.pickerItem}>
                          <Text style={[styles.pickerText, isSelected && styles.pickerTextSelected]}>
                            {item}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  <View style={styles.indicatorLine} pointerEvents="none" />
              </View>

              <View style={styles.unitColumn}>
                {(pickerType === 'weight' ? ['kg', 'lbs'] : ['cm', 'ft']).map((u) => (
                  <TouchableOpacity 
                    key={u} 
                    onPress={() => setPickerUnit(u)}
                    style={[styles.unitBtn, pickerUnit === u && styles.unitBtnActive]}
                  >
                    <Text style={[styles.unitBtnText, pickerUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    height: 100,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    borderRadius: 3,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 32,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (screenWidth - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
        android: { elevation: 2 }
    })
  },
  activeCard: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  cardUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bmiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  bmiStatus: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  bmiBigValue: {
    fontSize: 42,
    fontWeight: '800',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  pickerWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    height: 250,
  },
  pickerMain: {
    flex: 1,
    position: 'relative',
  },
  indicatorLine: {
    position: 'absolute',
    top: 250 / 2 - ITEM_HEIGHT / 2,
    height: ITEM_HEIGHT,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#7C3AED20',
    backgroundColor: '#7C3AED05',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  pickerTextSelected: {
    fontSize: 32,
    fontWeight: '800',
    color: '#7C3AED',
  },
  unitColumn: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  unitBtn: {
    width: 60,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#7C3AED',
  },
  unitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  unitBtnTextActive: {
    color: '#FFF',
  },
});

export default PhysicalInfoScreen;