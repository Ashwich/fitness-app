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

const GREEN = '#30d158';

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
            placeholderTextColor="#9ca3af"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sync" size={18} color="#fff" />
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
            <Ionicons name="alert-circle" size={18} color="#B91C1C" />
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
    backgroundColor: 'rgba(48,209,88,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
  panel: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.35)',
    backgroundColor: 'rgba(48,209,88,0.06)',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
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
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 15,
  },
  disabled: { opacity: 0.7 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#B91C1C' },
});
