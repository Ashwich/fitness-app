import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Heading,
  Icon,
  ListCard,
  ListRow,
  Screen,
  TopBar,
  Txt,
} from '../../components/ui';
import { colors } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import {
  confirmPhoneOtp,
  formatFirebaseAuthError,
  isFirebaseNativeReady,
  normalizePhoneToE164,
  sendPhoneOtp,
} from '../../services/firebaseAuthService';

const pretty = (e164) => (e164 ? e164.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2') : '');

/**
 * Add a phone number to the signed-in account (shown after Google sign-in, or
 * from Settings). The number is verified by SMS code. If it already belongs to
 * another Fitsera account, the member can merge that account into this one.
 */
export default function LinkPhoneScreen({ navigation, route }) {
  const fromSettings = Boolean(route?.params?.fromSettings);
  const { linkPhoneForGym, skipPhoneLink } = useAuth();
  const [step, setStep] = useState('phone'); // phone | code | merge
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [other, setOther] = useState(null);
  const confirmation = useRef(null);
  const idToken = useRef(null);
  const canVerify = isFirebaseNativeReady();

  const done = (result) => {
    if (fromSettings) navigation.goBack();
    return result;
  };

  const link = async (opts = {}) => {
    const result = await linkPhoneForGym(e164 || normalizePhoneToE164(phone), {
      idToken: idToken.current || undefined,
      ...opts,
    });
    if (result.success) return done(result);
    if (result.code === 'PHONE_IN_USE') {
      setOther(result.details || {});
      setStep('merge');
      return null;
    }
    if (result.code === 'PHONE_VERIFICATION_INVALID') {
      idToken.current = null;
      setStep('phone');
    }
    setError(result.error || 'Could not add this number');
    return null;
  };

  const sendCode = async () => {
    setError('');
    const n = normalizePhoneToE164(phone);
    if (!n) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setE164(n);
    setBusy(true);
    try {
      if (!canVerify) {
        // Expo Go / dev build without Firebase: the dev backend accepts unverified numbers.
        await link();
        return;
      }
      confirmation.current = await sendPhoneOtp(n);
      setCode('');
      setStep('code');
    } catch (e) {
      setError(formatFirebaseAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const res = await confirmPhoneOtp(confirmation.current, code);
      idToken.current = res.idToken;
      await link();
    } catch (e) {
      setError(formatFirebaseAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const merge = async () => {
    setError('');
    setBusy(true);
    try {
      await link({ merge: true });
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep('phone');
    setOther(null);
    setCode('');
    idToken.current = null;
    setError('');
  };

  const leave = fromSettings ? () => navigation.goBack() : skipPhoneLink;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          <TopBar
            onBack={step === 'phone' ? (fromSettings ? leave : undefined) : restart}
            icon={step === 'phone' && fromSettings ? 'close' : 'back'}
          />
        }
      >
        {step === 'phone' ? (
          <>
            <Heading
              title={fromSettings ? 'Phone number' : 'Link your gym phone'}
              subtitle="Use the number your gym has on file so your membership, check-ins and trainer plans sync. We'll text you a code to confirm it."
            />
            <Field
              label="Mobile number"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              maxLength={16}
              autoFocus
            />
            <ErrorBox message={error} />
            <Button title={canVerify ? 'Send code' : 'Save number'} onPress={sendCode} loading={busy} />
            <Button title={fromSettings ? 'Cancel' : 'Skip for now'} variant="ghost" onPress={leave} disabled={busy} />
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <Heading title="Enter the code" subtitle={`We sent a 6-digit code to ${pretty(e164)}.`} />
            <Field
              label="Code"
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              maxLength={6}
              autoFocus
              inputStyle={styles.code}
            />
            <ErrorBox message={error} />
            <Button title="Verify" onPress={verify} loading={busy} />
            <Button title="Send a new code" variant="ghost" onPress={sendCode} disabled={busy} />
          </>
        ) : null}

        {step === 'merge' ? (
          <>
            <Heading
              title="You already have an account"
              subtitle={`${pretty(e164)} is used by another Fitsera account. Merge it into the account you're signed in with so everything is in one place.`}
            />
            <Card style={{ gap: 12 }}>
              <View style={styles.otherHead}>
                <View style={styles.otherIcon}>
                  <Icon name="profile" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={styles.otherName}>{other?.name || 'Phone account'}</Txt>
                  {other?.createdAt ? (
                    <Txt style={styles.meta}>
                      Since {new Date(other.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </Txt>
                  ) : null}
                </View>
              </View>
            </Card>
            <ListCard>
              <ListRow title="Food diary" value={`${other?.diaryDays || 0} ${other?.diaryDays === 1 ? 'day' : 'days'}`} />
              <ListRow title="Profile and goals" value={other?.hasProfile ? 'Yes' : 'None'} />
              <ListRow title="Gym membership" value={other?.gymLinked ? 'Linked' : 'None'} last />
            </ListCard>
            <Txt style={styles.note}>
              Your current details stay; anything missing is filled from the other account. Food logged on the same day
              is combined. The other account is then closed — sign in with Google or this number to reach the merged
              account.
            </Txt>
            <ErrorBox message={error} />
            <Button title="Merge accounts" onPress={merge} loading={busy} />
            <Button title="Use a different number" variant="ghost" onPress={restart} disabled={busy} />
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 24, letterSpacing: 8, fontWeight: '600' },
  otherHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  otherIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherName: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13, color: colors.label2 },
  note: { fontSize: 13, lineHeight: 19, color: colors.label2, paddingHorizontal: 4 },
});
