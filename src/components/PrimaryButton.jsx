import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '../theme/opengym';

export const PrimaryButton = ({ title, onPress, disabled, loading, icon }) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <>
          {icon}
          <Text style={styles.label}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
  label: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
