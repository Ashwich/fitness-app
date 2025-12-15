import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export const ScreenContainer = ({ children }) => (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.fill}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  fill: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
});


