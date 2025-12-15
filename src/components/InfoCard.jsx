import { StyleSheet, Text, View } from 'react-native';

export const InfoCard = ({ title, value, children }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    {value !== undefined && value !== null && value !== '' ? (
      <Text style={styles.value}>{value}</Text>
    ) : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    gap: 6,
  },
  title: {
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
});


