import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

const GymSuperAdminDashboardScreen = () => (
  <ScreenContainer>
    <View style={styles.header}>
      <Text style={styles.title}>Gym Super Admin</Text>
      <Text style={styles.subtitle}>
        This screen will mirror the web GymSuperAdmin dashboard with multi-gym overview.
      </Text>
    </View>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
  },
});

export default GymSuperAdminDashboardScreen;


