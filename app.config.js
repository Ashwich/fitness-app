// Expo automatically loads EXPO_PUBLIC_* variables from .env file
export default {
  expo: {
    name: 'fitsera-app',
    slug: 'fitsera-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // Allow cleartext (HTTP) traffic for development
      usesCleartextTraffic: true,
      networkSecurityConfig: {
        domainConfig: [
          {
            domain: '192.168.1.6',
            cleartextTrafficPermitted: true,
          },
          {
            domain: '31.97.206.44',
            cleartextTrafficPermitted: true,
          },
          {
            domain: 'localhost',
            cleartextTrafficPermitted: true,
          },
        ],
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
            networkSecurityConfig: {
              cleartextTrafficPermitted: true,
            },
          },
        },
      ],
    ],
    extra: {
      usersServiceUrl: process.env.EXPO_PUBLIC_USERS_SERVICE_URL || 'http://31.97.206.44:8081',
      gymServiceUrl: process.env.EXPO_PUBLIC_GYM_SERVICE_URL || 'http://31.97.206.44:4000',
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'Fitsera',
    },
  },
};

