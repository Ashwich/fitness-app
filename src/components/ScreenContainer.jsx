import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors, space } from '../theme/opengym';

export const ScreenContainer = ({ children, noPadding = false }) => (
  <SafeAreaView style={styles.safeArea}>
    {noPadding ? (
      <View style={styles.fill}>{children}</View>
    ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    )}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    gap: space.cardGap,
    backgroundColor: colors.bg,
  },
});
