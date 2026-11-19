import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, ErrorBox, Loading, Screen, TopBar } from '../../components/ui';
import { AboutYouForm, BodyForm, PlanForm, validateAbout } from '../../components/setup/SetupForms';
import {
  aboutPayload,
  bodyPayload,
  calorieGoalsPayload,
  goalsFor,
  planPayload,
  profileToSetup,
} from '../../components/setup/setupState';
import { fetchProfile, upsertProfile } from '../../api/services/profileService';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

/**
 * Edit one part of the profile with the same forms as onboarding.
 * kind: 'about' | 'body' | 'plan' (from the route name or params).
 */
export default function SetupEditScreen({ navigation, route }) {
  const kind =
    route.params?.kind ||
    (route.name === 'BodyEdit' ? 'body' : route.name === 'PlanEdit' ? 'plan' : 'about');
  const { refreshUser } = useAuth();
  const [state, setState] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile()
      .then((p) => setState(profileToSetup(p || {})))
      .catch(() => setState(profileToSetup({})));
  }, []);

  const goals = useMemo(() => (state ? goalsFor(state) : null), [state]);

  const save = async () => {
    setError('');
    let payload;
    if (kind === 'about') {
      const e = validateAbout(state.about);
      setErrors(e);
      if (Object.keys(e).length) return;
      payload = aboutPayload(state.about);
    } else if (kind === 'body') {
      payload = { ...bodyPayload(state.body), calorieGoals: calorieGoalsPayload(goals) };
    } else {
      payload = { ...planPayload(state.plan), calorieGoals: calorieGoalsPayload(goals) };
    }
    setSaving(true);
    try {
      await upsertProfile(payload);
      refreshUser?.().catch?.(() => {});
      if (kind !== 'about' && goals?.calorieGoals) {
        Alert.alert('Saved', `Your daily target is now ${goals.calorieGoals.dailyCalories.toLocaleString('en-US')} kcal.`);
      }
      navigation.goBack();
    } catch (e) {
      setError(getReadableError(e) || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<TopBar onBack={() => navigation.goBack()} />}
        footer={state ? <Button title="Save" onPress={save} loading={saving} /> : null}
      >
        {!state ? <Loading /> : null}
        {state && kind === 'about' ? (
          <AboutYouForm value={state.about} errors={errors} onChange={(about) => setState((s) => ({ ...s, about }))} />
        ) : null}
        {state && kind === 'body' ? (
          <BodyForm value={state.body} onChange={(body) => setState((s) => ({ ...s, body }))} />
        ) : null}
        {state && kind === 'plan' ? (
          <PlanForm value={state.plan} onChange={(plan) => setState((s) => ({ ...s, plan }))} />
        ) : null}
        <ErrorBox message={error} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
