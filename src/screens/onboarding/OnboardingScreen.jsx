/**
 * New-user setup: About you → Your body → Your plan → Your targets.
 * Shown once after sign-in until the profile has body stats and a goal
 * (AuthContext.needsOnboarding). Each step is saved as you go so leaving
 * mid-way keeps what was entered.
 */
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ErrorBox, Loading, Screen, StepHeader } from '../../components/ui';
import {
  AboutYouForm,
  BodyForm,
  PlanForm,
  TargetsForm,
  validateAbout,
} from '../../components/setup/SetupForms';
import {
  aboutPayload,
  bodyPayload,
  calorieGoalsPayload,
  goalsFor,
  planPayload,
  profileToSetup,
} from '../../components/setup/setupState';
import { fetchProfile, upsertProfile } from '../../api/services/profileService';
import { setStepsGoal } from '../../services/healthService';
import { setWaterGoal } from '../../services/waterIntakeService';
import { savePeriodSettings } from '../../services/periodTrackingService';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

const TOTAL = 4;

export default function OnboardingScreen() {
  const { completeOnboarding, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [state, setState] = useState(() => profileToSetup({}));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchProfile()
      .then((p) => alive && p && setState(profileToSetup(p)))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const goals = useMemo(() => goalsFor(state), [state]);

  const back = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /** Best-effort save of one step; the final step must succeed. */
  const saveQuietly = async (payload) => {
    try {
      await upsertProfile(payload);
    } catch (e) {
      console.warn('[Onboarding] partial save failed:', getReadableError(e));
    }
  };

  const next = async () => {
    setError('');
    if (step === 1) {
      const e = validateAbout(state.about);
      setErrors(e);
      if (Object.keys(e).length) return;
      setSaving(true);
      await saveQuietly(aboutPayload(state.about));
      setSaving(false);
      setStep(2);
      return;
    }
    if (step === 2) {
      setSaving(true);
      await saveQuietly(bodyPayload(state.body));
      setSaving(false);
      setStep(3);
      return;
    }
    if (step === 3) {
      setSaving(true);
      await saveQuietly(planPayload(state.plan));
      setSaving(false);
      setStep(4);
      return;
    }
    // Step 4: save everything and enter the app.
    setSaving(true);
    try {
      await upsertProfile({
        ...aboutPayload(state.about),
        ...bodyPayload(state.body),
        ...planPayload(state.plan),
        dietType: state.dietType,
        calorieGoals: calorieGoalsPayload(goals),
        onboardingCompleted: true,
      });
      await Promise.all([
        setStepsGoal(goals.stepGoal),
        setWaterGoal(goals.waterGoalLiters),
        state.about.gender === 'female'
          ? savePeriodSettings({ enabled: true }).catch(() => {})
          : Promise.resolve(),
      ]);
      completeOnboarding();
    } catch (e) {
      setError(getReadableError(e) || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          <StepHeader
            step={step}
            total={TOTAL}
            onBack={step > 1 ? back : undefined}
          />
        }
        footer={
          <View style={{ gap: 4 }}>
            <Button
              title={step === TOTAL ? 'Start using Fitsera' : 'Continue'}
              onPress={next}
              loading={saving}
            />
            {step === 1 ? <Button title="Sign out" variant="ghost" height={44} onPress={logout} /> : null}
          </View>
        }
      >
        {step === 1 ? (
          <AboutYouForm
            value={state.about}
            errors={errors}
            onChange={(about) => setState((s) => ({ ...s, about }))}
          />
        ) : null}
        {step === 2 ? (
          <BodyForm value={state.body} onChange={(body) => setState((s) => ({ ...s, body }))} />
        ) : null}
        {step === 3 ? (
          <PlanForm value={state.plan} onChange={(plan) => setState((s) => ({ ...s, plan }))} />
        ) : null}
        {step === 4 ? (
          <TargetsForm
            goals={goals}
            dietType={state.dietType}
            onDietType={(dietType) => setState((s) => ({ ...s, dietType }))}
          />
        ) : null}
        <ErrorBox message={error} />
        {step === 1 ? <View style={{ height: 40 }} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
