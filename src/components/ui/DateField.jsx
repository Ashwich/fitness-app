import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../theme/opengym';
import { Button, FieldButton, Txt } from './index';

const fmt = (d) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** Date of birth field: Android uses the system dialog, iOS a bottom sheet with Done. */
export function DateField({ label, value, onChange, maximumDate = new Date(), minimumDate }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || new Date(2000, 0, 1));

  const show = () => {
    setDraft(value || new Date(2000, 0, 1));
    setOpen(true);
  };

  return (
    <>
      <FieldButton label={label} value={fmt(value)} placeholder="Select date" onPress={show} />
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(date);
          }}
        />
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Txt style={styles.title}>{label}</Txt>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              themeVariant="light"
              textColor={colors.label}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={(_e, date) => date && setDraft(date)}
            />
            <Button
              title="Done"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default DateField;
