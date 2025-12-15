import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

const SuperAdminDashboardScreen = () => (
  <ScreenContainer>
    <View style={styles.header}>
      <Text style={styles.title}>Super Admin Dashboard</Text>
      <Text style={styles.subtitle}>
        This screen will mirror the web super admin dashboard: manage gyms, admins, and platform
        settings.
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

export default SuperAdminDashboardScreen;


