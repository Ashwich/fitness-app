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
import { useAuth } from '../../context/AuthContext';
import {
  isFirebaseNativeReady,
  sendPhoneOtp,
  confirmPhoneOtp,
  signInWithGoogle,
  normalizePhoneToE164,
  formatFirebaseAuthError,
} from '../../services/firebaseAuthService';
import { getReadableError } from '../../utils/apiError';
import { colors, FONT_FAMILY } from '../../theme/opengym';

const GREEN = colors.accent;

/**
 * Phone OTP + Google sign-in.
 * - Native build: Firebase OTP / Google
 * - Expo Go: phone-only dev login (Google requires native build)
 */
export default function FirebaseAuthButtons() {
  const { loginWithFirebase, loginWithDevPhone } = useAuth();
  const [mode, setMode] = useState('choose'); // choose | phone | google
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firebaseReady = isFirebaseNativeReady();
  const useDevPhone = !firebaseReady;

  const finishWithIdToken = async (idToken, { fromGoogle = false } = {}) => {
    const result = await loginWithFirebase(idToken, { fromGoogle });
    if (!result.success) {
      setError(result.error || 'Authentication failed');
    }
    return result;
  };

  const handleDevContinue = async () => {
    setLoading(true);
    setError('');
    try {
      const e164 = normalizePhoneToE164(phone);
      if (!e164) {
        setError('Enter a valid 10-digit Indian mobile number');
        return;
      }
      const result = await loginWithDevPhone(e164);
      if (!result.success) {
        setError(result.error || 'Could not sign in with this number');
      }
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const e164 = normalizePhoneToE164(phone);
      if (!e164) {
        setError('Enter a valid 10-digit Indian mobile number');
        setLoading(false);
        return;
      }
      const conf = await sendPhoneOtp(e164);
      setConfirmation(conf);
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      if (!confirmation) {
        setError('Request an OTP first');
        setLoading(false);
        return;
      }
      const { idToken } = await confirmPhoneOtp(confirmation, otp);
      await finishWithIdToken(idToken, { fromGoogle: false });
      setConfirmation(null);
      setOtp('');
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      if (!firebaseReady) {
        setError('Google Sign-In needs a native build (not Expo Go). Use phone for now, or run: npx expo run:android');
        return;
      }
      const { idToken } = await signInWithGoogle();
      await finishWithIdToken(idToken, { fromGoogle: true });
    } catch (err) {
      setError(formatFirebaseAuthError(err) || getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const ErrorBox = error ? (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.red} />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : null;

  if (mode === 'choose') {
    return (
      <View style={styles.wrap}>

        <TouchableOpacity
          style={[styles.methodBtn, styles.phoneMethod]}
          onPress={() => {
            setMode('phone');
            setError('');
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="call" size={22} color={colors.onAccent} />
          <View style={styles.methodTextWrap}>
            <Text style={styles.methodTitle}>Continue with phone</Text>
            <Text style={styles.methodSub}>
              {useDevPhone ? 'Dev login in Expo Go' : 'OTP verification'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodBtn, styles.googleMethod, loading && styles.disabled]}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading && mode === 'choose' ? (
            <ActivityIndicator color={colors.label} />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color={colors.label} />
              <View style={styles.methodTextWrap}>
                <Text style={[styles.methodTitle, styles.googleTitle]}>Continue with Google</Text>
                <Text style={[styles.methodSub, styles.googleSub]}>
                  {firebaseReady ? 'Then optional gym phone' : 'Requires native build'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.label2} />
            </>
          )}
        </TouchableOpacity>

        {ErrorBox}
      </View>
    );
  }

  // Phone flow
  if (useDevPhone) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.backRow} onPress={() => setMode('choose')}>
          <Ionicons name="arrow-back" size={18} color={colors.label2} />
          <Text style={styles.backText}>Other options</Text>
        </TouchableOpacity>

        <Text style={styles.lead}>
          Expo Go testing: enter your gym member phone number. No OTP — you will
          be signed in and synced if that number is on a gym roster.
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
            onPress={handleDevContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.primaryText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.devBanner}>
          Dev login only (Expo Go). Real OTP & Google need a native build.
        </Text>

        {ErrorBox}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => {
          setMode('choose');
          setConfirmation(null);
          setOtp('');
          setError('');
        }}
      >
        <Ionicons name="arrow-back" size={18} color={colors.label2} />
        <Text style={styles.backText}>Other options</Text>
      </TouchableOpacity>

      <Text style={styles.lead}>
        Enter your phone number. We will send an OTP — new users are registered
        automatically; existing users are signed in.
      </Text>

      {!confirmation ? (
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
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.primaryText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.label}>Enter OTP sent to {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit OTP"
            placeholderTextColor={colors.label3}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            autoFocus
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.primaryText}>Verify & continue</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setConfirmation(null);
                setOtp('');
                setError('');
              }}
            >
              <Text style={styles.cancelText}>Change number</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {ErrorBox}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  lead: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label2,
    marginBottom: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backText: { fontFamily: FONT_FAMILY, fontSize: 14, color: colors.label2, fontWeight: '600' },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  phoneMethod: {
    backgroundColor: GREEN,
  },
  googleMethod: {
    backgroundColor: colors.surface,
    borderWidth: 0,
    borderColor: colors.sep,
  },
  methodTextWrap: { flex: 1 },
  methodTitle: {
    color: colors.onAccent,
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
    fontSize: 16,
  },
  methodSub: {
    color: colors.inkMuted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
  },
  googleTitle: { color: colors.label },
  googleSub: { color: colors.label2 },
  devBanner: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17,
    color: colors.orange,
    textAlign: 'center',
  },
  panel: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: colors.label2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: colors.label,
  },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontFamily: FONT_FAMILY, fontSize: 15 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cancelText: { color: colors.label2, fontWeight: '600', fontFamily: FONT_FAMILY, fontSize: 13 },
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
