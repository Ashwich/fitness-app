import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const EMAIL_FOR_SIGNIN_KEY = 'emailForSignIn';

let googleConfigured = false;
let authModule = null;

/**
 * @react-native-firebase requires a custom native build (not Expo Go).
 * Its JS entry constructs RNFBNativeEventEmitter at import time and throws
 * if RNFBAppModule is missing — never require() it inside Expo Go.
 */
export function isFirebaseNativeReady() {
  if (Constants.appOwnership === 'expo') return false;
  return Boolean(NativeModules.RNFBAppModule);
}

function nativeUnavailableError(message) {
  const err = new Error(
    message ||
      'Firebase Auth requires a development build. Stop Expo Go and run: npx expo run:android'
  );
  err.code = 'firebase/native-unavailable';
  return err;
}

function getAuth() {
  if (!isFirebaseNativeReady()) {
    throw nativeUnavailableError();
  }
  if (authModule) return authModule;
  try {
    authModule = require('@react-native-firebase/auth').default;
    return authModule;
  } catch {
    throw nativeUnavailableError(
      'Firebase Auth native module failed to load. Rebuild with: npx expo run:android'
    );
  }
}

function getGoogleSignin() {
  if (!isFirebaseNativeReady()) {
    throw nativeUnavailableError(
      'Google Sign-In requires a development build. Run: npx expo run:android'
    );
  }
  try {
    return require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    throw nativeUnavailableError(
      'Google Sign-In requires a development build. Run: npx expo run:android'
    );
  }
}

function getWebClientId() {
  const fromEnv = (process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || '').trim();
  if (fromEnv) return fromEnv;
  // Web client from Firebase google-services.json (client_type 3)
  return '732410775120-1j5pp6sp4uh2ifrodu3s3o00ddurie2f.apps.googleusercontent.com';
}

export function configureGoogleSignIn() {
  if (googleConfigured) return;
  if (!isFirebaseNativeReady()) return;
  const webClientId = getWebClientId();
  if (!webClientId) {
    console.warn(
      'EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID is missing. Google Sign-In will fail until set.'
    );
  }
  getGoogleSignin().configure({
    webClientId: webClientId || undefined,
    offlineAccess: false,
  });
  googleConfigured = true;
}

/**
 * Google → Firebase credential → ID token for backend /auth/firebase
 */
export async function signInWithGoogle() {
  const auth = getAuth();
  const GoogleSignin = getGoogleSignin();
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken = result?.data?.idToken || result?.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an ID token');
  }
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const userCred = await auth().signInWithCredential(credential);
  const firebaseIdToken = await userCred.user.getIdToken(true);
  return {
    idToken: firebaseIdToken,
    user: userCred.user,
    provider: 'google.com',
  };
}

export async function signInWithEmail(email, password) {
  const auth = getAuth();
  const userCred = await auth().signInWithEmailAndPassword(
    String(email).trim().toLowerCase(),
    password
  );
  const idToken = await userCred.user.getIdToken(true);
  return { idToken, user: userCred.user, provider: 'password' };
}

export async function signUpWithEmail(email, password, displayName = '') {
  const auth = getAuth();
  const userCred = await auth().createUserWithEmailAndPassword(
    String(email).trim().toLowerCase(),
    password
  );
  if (displayName?.trim()) {
    try {
      await userCred.user.updateProfile({ displayName: displayName.trim() });
    } catch {
      /* non-fatal */
    }
  }
  const idToken = await userCred.user.getIdToken(true);
  return { idToken, user: userCred.user, provider: 'password' };
}

/**
 * Start phone OTP. Returns confirmation object for confirmPhoneOtp.
 * @param {string} phoneE164 e.g. +919876543210
 */
export async function sendPhoneOtp(phoneE164) {
  const auth = getAuth();
  const confirmation = await auth().signInWithPhoneNumber(phoneE164);
  return confirmation;
}

export async function confirmPhoneOtp(confirmation, code) {
  const userCred = await confirmation.confirm(String(code).trim());
  const idToken = await userCred.user.getIdToken(true);
  return { idToken, user: userCred.user, provider: 'phone' };
}

function getEmailLinkContinueUrl() {
  return 'fitsera://auth/email-link';
}

export async function sendEmailSignInLink(email) {
  const auth = getAuth();
  const normalized = String(email).trim().toLowerCase();
  const actionCodeSettings = {
    url: getEmailLinkContinueUrl(),
    handleCodeInApp: true,
    android: {
      packageName: 'com.fitsera.app',
      installApp: true,
      minimumVersion: '1',
    },
    iOS: {
      bundleId: 'com.fitsera.app',
    },
  };
  await auth().sendSignInLinkToEmail(normalized, actionCodeSettings);
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(EMAIL_FOR_SIGNIN_KEY, normalized);
  return { email: normalized };
}

export async function isEmailSignInLink(url) {
  const auth = getAuth();
  return auth().isSignInWithEmailLink(url);
}

export async function completeEmailLinkSignIn(email, link) {
  const auth = getAuth();
  const normalized = String(email).trim().toLowerCase();
  const userCred = await auth().signInWithEmailLink(normalized, link);
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
  const idToken = await userCred.user.getIdToken(true);
  return { idToken, user: userCred.user, provider: 'email_link' };
}

export async function getStoredEmailForSignIn() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return (await AsyncStorage.getItem(EMAIL_FOR_SIGNIN_KEY)) || '';
  } catch {
    return '';
  }
}

export function normalizePhoneToE164(raw, defaultCountry = '91') {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (String(raw).trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

export function formatFirebaseAuthError(err) {
  const code = err?.code || '';
  if (code === 'firebase/native-unavailable') {
    return err.message;
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Try signing in.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found for this email.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid phone number. Use +91… format.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait and try again.';
  }
  if (code === 'auth/unauthorized-continue-uri') {
    return 'Email link domain is not authorized in Firebase Console.';
  }
  if (Platform.OS === 'ios' && code.includes('phone')) {
    return `${err.message || 'Phone auth failed'}. Ensure APNs is configured in Firebase.`;
  }
  return err?.message || 'Authentication failed';
}

export { EMAIL_FOR_SIGNIN_KEY };
