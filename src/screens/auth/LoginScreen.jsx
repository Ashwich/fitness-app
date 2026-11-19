import { KeyboardAvoidingView, Platform } from 'react-native';
import FirebaseAuthButtons from '../../components/auth/FirebaseAuthButtons';
import { Heading, Screen, TopBar } from '../../components/ui';

export default function LoginScreen({ navigation }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<TopBar onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />}>
        <Heading
          title="Sign in"
          subtitle="Use your phone number or Google. If your gym uses Fitsera, use the number they have on file to sync your membership."
        />
        <FirebaseAuthButtons />
      </Screen>
    </KeyboardAvoidingView>
  );
}
