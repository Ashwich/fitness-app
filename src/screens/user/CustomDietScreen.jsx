import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, ErrorBox, Field, Heading, Screen, TopBar } from '../../components/ui';
import {
  CustomDietEditor,
  customDietPayload,
  emptyCustomDiet,
  validateCustomDiet,
} from '../../components/setup/PlanChoices';
import { fetchProfile } from '../../api/services/profileService';
import { calorieGoalsOf } from '../../utils/profileTargets';
import { getReadableError } from '../../utils/apiError';
import { applyCustomDiet } from './dietState';

/** Build your own diet: daily macros plus the foods you eat at each meal. */
export default function CustomDietScreen({ navigation }) {
  const [diet, setDiet] = useState(() => emptyCustomDiet());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile()
      .then((p) => setDiet((d) => ({ ...d, targets: emptyCustomDiet(calorieGoalsOf(p)).targets })))
      .catch(() => {});
  }, []);

  const save = async () => {
    const msg = validateCustomDiet(diet);
    setError(msg);
    if (msg) return;
    setSaving(true);
    try {
      await applyCustomDiet(customDietPayload(diet));
      Alert.alert('Diet saved', 'Your targets are updated. Add meals to your diary from Eat → Plans.');
      navigation.goBack();
    } catch (e) {
      setError(getReadableError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<TopBar onBack={() => navigation.goBack()} title="My diet" />}
        footer={<Button title="Save diet" onPress={save} loading={saving} />}
      >
        <Heading title="Your own diet" subtitle="Set your daily macros and add the foods you usually eat." />
        <Field
          label="Plan name"
          value={diet.name}
          onChangeText={(name) => setDiet({ ...diet, name })}
          placeholder="My diet"
          maxLength={60}
        />
        <CustomDietEditor value={diet} onChange={setDiet} />
        <ErrorBox message={error} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
