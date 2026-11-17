import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/opengym';

export const AppLoader = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.accent} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});


