import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

const StaffDashboardScreen = () => (
  <ScreenContainer>
    <View style={styles.header}>
      <Text style={styles.title}>Staff Dashboard</Text>
      <Text style={styles.subtitle}>
        This screen will mirror the web StaffDashboard: member check-ins, PT sessions and tasks.
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

export default StaffDashboardScreen;


