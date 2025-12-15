import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const AppLoader = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#2563eb" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
});


