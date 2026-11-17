import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseMedia, { MediaAttribution } from './ExerciseMedia';
import { colors } from '../../theme/opengym';

const PURPLE = colors.accent;

export default function ExerciseDetailModal({ visible, exercise, onClose }) {
  if (!exercise) return null;

  const title = exercise.catalogName || exercise.name || 'Exercise';
  const steps = exercise.steps || exercise.catalog?.st || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.label} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <ExerciseMedia exercise={exercise} />
          <MediaAttribution />

          <View style={styles.metaRow}>
            {exercise.bodyPart ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{exercise.bodyPart}</Text>
              </View>
            ) : null}
            {exercise.target ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{exercise.target}</Text>
              </View>
            ) : null}
            {exercise.equipment ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{exercise.equipment}</Text>
              </View>
            ) : null}
          </View>

          {(exercise.sets != null || exercise.reps != null) && (
            <Text style={styles.prescription}>
              {[exercise.sets != null && `${exercise.sets} sets`, exercise.reps != null && `${exercise.reps} reps`]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}

          {steps.length > 0 ? (
            <View style={styles.steps}>
              <Text style={styles.stepsTitle}>How to perform</Text>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSteps}>No instructions available for this exercise.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
    gap: 12,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.label, textTransform: 'capitalize' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.accent, textTransform: 'capitalize' },
  prescription: { fontSize: 15, fontWeight: '700', color: PURPLE },
  steps: { gap: 10, marginTop: 8 },
  stepsTitle: { fontSize: 16, fontWeight: '800', color: colors.label, marginBottom: 4 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PURPLE,
    color: colors.label,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.label2 },
  noSteps: { fontSize: 14, color: colors.label3 },
});
