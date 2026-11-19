import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Heading,
  Icon,
  ListCard,
  ListRow,
  Loading,
  Pill,
  Screen,
  Section,
  TopBar,
  Txt,
} from '../../components/ui';
import { colors, FONT_FAMILY } from '../../theme/opengym';
import { getSuggestedDiets, selectDietTemplate } from '../../api/services/dietService';
import { getReadableError } from '../../utils/apiError';
import { DIET_TYPES, fmt } from '../../utils/profileTargets';

/** Trainer-assigned diet first, then templates for the user's diet type. */
export default function DietPlansScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selecting, setSelecting] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await getSuggestedDiets());
    } catch (e) {
      Alert.alert('Could not load plans', getReadableError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const select = async (id) => {
    setSelecting(id);
    try {
      await selectDietTemplate(id);
      await load();
    } catch (e) {
      Alert.alert('Could not select', getReadableError(e));
    } finally {
      setSelecting(null);
    }
  };

  const templates = data?.templates || [];
  const trainer = data?.trainerPlan;
  const selectedId = data?.selectedDietTemplateId;
  const typeLabel = DIET_TYPES.find((t) => t.value === (data?.dietType || 'VEG'))?.label || 'Vegetarian';

  return (
    <Screen header={<TopBar onBack={() => navigation.goBack()} title="Plans" />}>
      <Heading title="Diet plans" subtitle={`${typeLabel} plans matched to your goal.`} />
      {loading ? <Loading /> : null}

      {trainer ? (
        <Card tone="ink" style={{ gap: 8 }}>
          <Pill>From your trainer</Pill>
          <Txt style={styles.trainerTitle}>{trainer.title || 'Assigned diet'}</Txt>
          {trainer.description ? <Txt style={styles.trainerSub}>{trainer.description}</Txt> : null}
        </Card>
      ) : null}

      {!loading ? (
        <Section title="Suggested for you">
          {templates.length === 0 ? (
            <Card style={styles.empty}>
              <Icon name="leaf" size={28} color={colors.label3} />
              <Txt style={styles.emptyText}>No plans for your diet type yet. Ask your gym trainer to assign one.</Txt>
            </Card>
          ) : (
            <ListCard>
              {templates.map((t, i) => {
                const on = selectedId === t.id;
                return (
                  <ListRow
                    key={t.id}
                    title={t.name}
                    subtitle={
                      [t.calorieTarget ? `${fmt(t.calorieTarget)} kcal a day` : null, t.description]
                        .filter(Boolean)
                        .join(' · ') || 'Tap to use this plan'
                    }
                    last={i === templates.length - 1}
                    onPress={on || selecting ? undefined : () => select(t.id)}
                    right={
                      selecting === t.id ? (
                        <ActivityIndicator color={colors.label} />
                      ) : on ? (
                        <Pill>Active</Pill>
                      ) : (
                        <Icon name="chevron" size={18} color={colors.label3} strokeWidth={2} />
                      )
                    }
                  />
                );
              })}
            </ListCard>
          )}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trainerTitle: { fontFamily: FONT_FAMILY, fontSize: 20, fontWeight: '600', color: colors.onInk },
  trainerSub: { fontFamily: FONT_FAMILY, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyText: { fontFamily: FONT_FAMILY, fontSize: 14, color: colors.label2, textAlign: 'center', lineHeight: 20 },
});
