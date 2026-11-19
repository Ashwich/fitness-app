import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, FONT_FAMILY } from '../theme/opengym';

export const FormTextInput = forwardRef(
  ({ label, error, style, containerStyle, ...rest }, ref) => {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.label3}
          style={[styles.input, error && styles.errorBorder, style]}
          {...rest}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }
);

FormTextInput.displayName = 'FormTextInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: colors.label3,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: colors.label,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  errorBorder: {
    borderColor: colors.red,
  },
  errorText: {
    color: colors.red,
    marginTop: 6,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
});
