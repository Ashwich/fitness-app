import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { normalizePhoneToE164 } from '../../services/firebaseAuthService';
import { getReadableError } from '../../utils/apiError';
import { colors, FONT_FAMILY } from '../../theme/opengym';

const GREEN = colors.accent;

/**
 * Shown after Google (or any auth without phone).
 * User can add a phone to sync with their gym, or skip.
 */
export default function LinkPhoneScreen() {
  const { linkPhoneForGym, skipPhoneLink } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSync = async () => {
    setLoading(true);
    setError('');
    try {
      const e164 = normalizePhoneToE164(phone);
      if (!e164) {
        setError('Enter a valid 10-digit Indian mobile number');
        return;
      }
      const result = await linkPhoneForGym(e164);
      if (!result.success) {
        setError(result.error || 'Could not save phone');
      }
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="call-outline" size={36} color={GREEN} />
        </View>
        <Text style={styles.title}>Link your gym phone</Text>
        <Text style={styles.body}>
          Add the mobile number your gym has on file so we can sync your
          membership. You can skip and do this later from Gym.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="98765 43210"
            placeholderTextColor={colors.label3}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={14}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={handleSync}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Ionicons name="sync" size={18} color={colors.onAccent} />
                <Text style={styles.primaryText}>Save & sync gym</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={skipPhoneLink}
          disabled={loading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '800',
    color: colors.label,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    lineHeight: 22,
    color: colors.label2,
    textAlign: 'center',
  },
  panel: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentLine,
    backgroundColor: colors.accentSoft,
    marginTop: 8,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: colors.label,
  },
  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontFamily: FONT_FAMILY, fontSize: 15 },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    color: colors.label2,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
    fontSize: 15,
  },
  disabled: { opacity: 0.7 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.redSoft,
  },
  errorText: { flex: 1, fontFamily: FONT_FAMILY, fontSize: 13, color: colors.red },
});
