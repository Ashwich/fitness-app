import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { BootstrapProvider } from './src/context/BootstrapContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { IntroSplash } from './src/components/IntroSplash';

const queryClient = new QueryClient();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BootstrapProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </BootstrapProvider>
          </AuthProvider>
        </QueryClientProvider>
        <IntroSplash />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
