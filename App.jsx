import 'react-native-gesture-handler';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { BootstrapProvider } from './src/context/BootstrapContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { IntroSplash } from './src/components/IntroSplash';

const queryClient = new QueryClient();

export default function App() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BootstrapProvider>
            {/* Dark status icons over the cream intro, light over the app */}
            <StatusBar style={introDone ? 'light' : 'dark'} />
            <AppNavigator />
          </BootstrapProvider>
        </AuthProvider>
      </QueryClientProvider>
      <IntroSplash onFinish={() => setIntroDone(true)} />
    </GestureHandlerRootView>
  );
}
