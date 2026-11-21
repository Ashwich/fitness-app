import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Heading, Screen, TopBar } from '../../components/ui';
import { ProgramChoiceList } from '../../components/setup/PlanChoices';
import { fetchProfile } from '../../api/services/profileService';
import { getProgram, rankPrograms } from '../../data/workoutPrograms';
import { primaryGoalOf } from '../../utils/profileTargets';
import { applyProgram } from './trainState';

/** Choose a different training program (gym, home, fat loss, mobility…). */
export default function ProgramsScreen({ navigation, route }) {
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState('all');
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const fromTrainer = route?.params?.trainerPlan;

  useEffect(() => {
    fetchProfile().then(setProfile).catch(() => {});
  }, []);

  const programs = useMemo(
    () => rankPrograms({ primaryGoal: primaryGoalOf(profile), workoutsPerWeek: profile?.workoutsPerWeek }),
    [profile],
  );

  const use = async () => {
    const p = getProgram(picked);
    if (!p) return;
    setSaving(true);
    const saved = await applyProgram(p);
    setSaving(false);
    if (!saved) {
      Alert.alert('Saved on this phone', 'We couldn’t reach Fitsera, so this program is saved on this phone for now.');
    }
    navigation.goBack();
  };

  return (
    <Screen
      header={<TopBar onBack={() => navigation.goBack()} title="Programs" />}
      footer={
        <Button
          title={picked ? `Use ${getProgram(picked)?.name}` : 'Pick a program'}
          disabled={!picked}
          loading={saving}
          onPress={use}
        />
      }
    >
      <Heading
        title="Training programs"
        subtitle={
          fromTrainer
            ? 'Your trainer’s plan stays first on Train. A program you pick here is used if they remove it.'
            : 'Ranked for your goal and how often you train. Tap one to see the exercises.'
        }
      />
      <ProgramChoiceList
        programs={programs}
        value={picked}
        onChange={setPicked}
        filter={filter}
        onFilter={setFilter}
      />
    </Screen>
  );
}
