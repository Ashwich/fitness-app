import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconTile, ListCard, ListRow, Txt } from '../../components/ui';
import { colors } from '../../theme/opengym';

const FEATURES = [
  { icon: 'home', title: 'Steps, water and calories', sub: 'Your whole day on one screen' },
  { icon: 'eat', title: 'Food diary and diet plans', sub: 'Including plans from your trainer' },
  { icon: 'train', title: 'Workout plans', sub: 'Push, pull, legs and more' },
  { icon: 'qr', title: 'Gym check-ins', sub: 'Scan in and keep your streak' },
];

export default function HomepageScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Image
          source={require('../../../assets/logo-mark.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Fitsera"
        />
        <Txt style={styles.brand}>FITSERA</Txt>
        <Txt style={styles.title} accessibilityRole="header">
          Train smarter.{'\n'}Live stronger.
        </Txt>
        <Txt style={styles.sub}>Your fitness companion, connected to your gym.</Txt>
      </View>

      <ListCard style={styles.features}>
        {FEATURES.map((f, i) => (
          <ListRow
            key={f.title}
            left={<IconTile name={f.icon} size={36} />}
            title={f.title}
            subtitle={f.sub}
            last={i === FEATURES.length - 1}
          />
        ))}
      </ListCard>

      <View style={styles.actions}>
        <Button title="Get started" onPress={() => navigation.navigate('Login')} />
        <Txt style={styles.hint}>Sign in with your phone number or Google.</Txt>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 6 },
  logo: { width: 66, height: 90, marginBottom: 10 },
  brand: { fontSize: 13, fontWeight: '700', letterSpacing: 3, color: colors.label2 },
  title: { fontSize: 34, fontWeight: '600', letterSpacing: -0.8, textAlign: 'center', lineHeight: 40, marginTop: 6 },
  sub: { fontSize: 15, color: colors.label2, textAlign: 'center', marginTop: 4 },
  features: { marginHorizontal: 20 },
  actions: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 },
  hint: { fontSize: 13, color: colors.label2, textAlign: 'center' },
});
