import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';

const HomepageScreen = ({ navigation }) => (
  <ScreenContainer>
    <View style={styles.hero}>
      <Text style={styles.title}>Welcome to Fitsera</Text>
      <Text style={styles.subtitle}>
        Your personal fitness companion. Track your workouts, manage your goals, and achieve your fitness dreams.
      </Text>
    </View>

    <View style={styles.userSection}>
      <Text style={styles.sectionTitle}>User Portal</Text>
      <PrimaryButton
        title="Register"
        onPress={() => navigation.navigate('Register')}
      />
      <PrimaryButton
        title="Login"
        onPress={() => navigation.navigate('Login')}
      />
    </View>

    <View style={styles.adminSection}>
      <Text style={styles.sectionTitle}>Admin & Staff</Text>
      <PrimaryButton
        title="Gym Admin Login"
        onPress={() => navigation.navigate('GymAdminLogin')}
      />
      <PrimaryButton
        title="Staff Login"
        onPress={() => navigation.navigate('StaffLogin')}
      />
      <PrimaryButton
        title="Super Admin Login"
        onPress={() => navigation.navigate('SuperAdminLogin')}
      />
    </View>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  userSection: {
    marginBottom: 24,
    gap: 12,
  },
  adminSection: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});

export default HomepageScreen;


