import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export const FormTextInput = forwardRef(({ label, error, style, ...rest }, ref) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput ref={ref} style={[styles.input, error && styles.errorBorder, style]} {...rest} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

FormTextInput.displayName = 'FormTextInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    color: '#111827',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorBorder: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    marginTop: 4,
    fontSize: 12,
  },
});


