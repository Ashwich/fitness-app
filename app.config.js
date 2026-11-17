// Expo automatically loads EXPO_PUBLIC_* variables from .env file
const GOOGLE_IOS_URL_SCHEME =
  'com.googleusercontent.apps.732410775120-300ov04tjiphubomuavdmr431vf960r4';

export default {
  expo: {
    name: 'Fitsera',
    slug: 'fitsera-app',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fitsera.app',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSHealthShareUsageDescription:
          'This app needs access to your health data to track your steps and fitness activities.',
        NSHealthUpdateUsageDescription:
          'This app needs access to update your health data for step tracking.',
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [GOOGLE_IOS_URL_SCHEME],
          },
        ],
      },
      entitlements: {
        'com.apple.developer.healthkit': true,
        'aps-environment': 'production',
      },
    },
    android: {
      package: 'com.fitsera.app',
      versionCode: 2,
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: GOOGLE_IOS_URL_SCHEME,
        },
      ],
      'expo-secure-store',
      'expo-font',
      '@react-native-community/datetimepicker',
      'expo-sharing',
      'expo-status-bar',
      [
        'expo-notifications',
        {
          mode: 'production',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            buildReactNativeFromSource: true,
          },
          android: {
            usesCleartextTraffic: false,
          },
        },
      ],
    ],
    extra: {
      usersServiceUrl:
        process.env.EXPO_PUBLIC_USERS_SERVICE_URL ||
        'https://users-api.fitsera.in',
      gymServiceUrl:
        process.env.EXPO_PUBLIC_GYM_SERVICE_URL || 'https://api.fitsera.in',
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'Fitsera',
      firebaseWebClientId:
        process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID ||
        '732410775120-1j5pp6sp4uh2ifrodu3s3o00ddurie2f.apps.googleusercontent.com',
      eas: {
        projectId: 'e9e012b4-6f25-46b5-ae89-d81eaa6358d6',
      },
    },
  },
};
