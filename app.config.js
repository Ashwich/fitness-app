// Expo automatically loads EXPO_PUBLIC_* variables from .env file
const GOOGLE_IOS_URL_SCHEME =
  'com.googleusercontent.apps.732410775120-300ov04tjiphubomuavdmr431vf960r4';

export default {
  expo: {
    name: 'Fitsera',
    slug: 'fitsera-app',
    version: '1.2.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
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
        backgroundColor: '#F3EFE6',
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
      [
        'expo-splash-screen',
        {
          // Plain cream launch screen; the animated logo intro plays right after
          // on the same background (see src/components/IntroSplash.jsx).
          backgroundColor: '#F3EFE6',
        },
      ],
      'expo-secure-store',
      [
        'expo-font',
        {
          // Inter Tight, embedded natively so fontFamily 'Inter Tight' + fontWeight works on both platforms
          ios: {
            fonts: [
              './assets/fonts/InterTight_400Regular.ttf',
              './assets/fonts/InterTight_500Medium.ttf',
              './assets/fonts/InterTight_600SemiBold.ttf',
              './assets/fonts/InterTight_700Bold.ttf',
            ],
          },
          android: {
            fonts: [
              {
                fontFamily: 'Inter Tight',
                fontDefinitions: [
                  { path: './assets/fonts/InterTight_400Regular.ttf', weight: 400 },
                  { path: './assets/fonts/InterTight_500Medium.ttf', weight: 500 },
                  { path: './assets/fonts/InterTight_600SemiBold.ttf', weight: 600 },
                  { path: './assets/fonts/InterTight_700Bold.ttf', weight: 700 },
                ],
              },
            ],
          },
        },
      ],
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
