import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  getPeriodSettings,
  savePeriodSettings,
  predictNextPeriod,
  dayInCycle,
  isPeriodDay,
} from '../../services/periodTrackingService';
import { colors } from '../../theme/opengym';
import { toLocalISODate } from '../../utils/date';

const PURPLE = colors.purple;
const ROSE = colors.pink;

const PeriodTrackingScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getPeriodSettings();
    setSettings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await savePeriodSettings(settings);
      setSettings(saved);
      Alert.alert('Saved', 'Period tracking preferences updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save period settings.');
    } finally {
      setSaving(false);
    }
  };

  const markPeriodStartedToday = async () => {
    const today = toLocalISODate();
    const next = await savePeriodSettings({
      ...settings,
      enabled: true,
      lastPeriodStart: today,
    });
    setSettings(next);
    Alert.alert('Logged', 'Period start set to today.');
  };

  if (!settings) {
    return (
      <ScreenContainer>
        <View style={styles.center} />
      </ScreenContainer>
    );
  }

  const next = predictNextPeriod(settings);
  const day = dayInCycle(settings);
  const onPeriod = isPeriodDay(settings);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.label} />
        </TouchableOpacity>
        <Text style={styles.title}>Period tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enable tracking</Text>
              <Text style={styles.cardSub}>Private on this device — not shared.</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => update({ enabled })}
              trackColor={{ true: ROSE, false: colors.surface3 }}
            />
          </View>
        </View>

        {settings.enabled ? (
          <>
            <View style={[styles.statusCard, onPeriod && styles.statusPeriod]}>
              <Text style={styles.statusLabel}>
                {onPeriod ? 'Period day' : 'Cycle day'}
              </Text>
              <Text style={styles.statusValue}>
                {day != null ? `Day ${day}` : 'Log your last period start'}
              </Text>
              {next ? (
                <Text style={styles.statusNext}>Next predicted: {next}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Last period start (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={settings.lastPeriodStart || ''}
                onChangeText={(lastPeriodStart) => update({ lastPeriodStart })}
                placeholder="2026-09-01"
                placeholderTextColor={colors.label3}
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={markPeriodStartedToday}>
                <Text style={styles.secondaryText}>Started today</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Typical cycle length (days)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(settings.cycleLengthDays ?? 28)}
                onChangeText={(v) =>
                  update({ cycleLengthDays: Math.max(15, Math.min(45, parseInt(v, 10) || 28)) })
                }
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Period length (days)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(settings.periodLengthDays ?? 5)}
                onChangeText={(v) =>
                  update({ periodLengthDays: Math.max(1, Math.min(10, parseInt(v, 10) || 5)) })
                }
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                value={settings.notes || ''}
                onChangeText={(notes) => update({ notes })}
                placeholder="Symptoms, energy, etc."
                placeholderTextColor={colors.label3}
              />
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.label },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    gap: 8,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.label },
  cardSub: { fontSize: 12, color: colors.label2, marginTop: 2 },
  statusCard: {
    backgroundColor: colors.purpleSoft,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.purpleSoft,
    alignItems: 'center',
  },
  statusPeriod: { backgroundColor: colors.pinkSoft, borderColor: colors.pinkSoft },
  statusLabel: { fontSize: 12, fontWeight: '700', color: colors.label3, textTransform: 'uppercase' },
  statusValue: { fontSize: 28, fontWeight: '800', color: colors.label, marginTop: 6 },
  statusNext: { fontSize: 13, color: ROSE, marginTop: 8, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: colors.label2, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.label,
    backgroundColor: colors.surface2,
  },
  primaryBtn: {
    backgroundColor: ROSE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: colors.label, fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { color: ROSE, fontWeight: '700' },
});

export default PeriodTrackingScreen;
