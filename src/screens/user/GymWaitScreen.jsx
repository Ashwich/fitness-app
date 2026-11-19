import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Icon, PageTitle, Screen, Txt } from '../../components/ui';
import { colors, FONT_FAMILY } from '../../theme/opengym';
import { useAuth } from '../../context/AuthContext';
import { getReadableError } from '../../utils/apiError';

/** Gym tab when the member has no linked gym ("Gym — empty state"). */
export default function GymWaitScreen() {
  const { refreshGymLink, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const retry = async () => {
    setLoading(true);
    try {
      const result = await refreshGymLink();
      if (result?.linked) {
        Alert.alert('Connected', result?.gym?.name ? `You're linked to ${result.gym.name}.` : 'Your gym account is linked.');
      } else {
        Alert.alert('Not linked yet', 'Ask your gym to add your phone number as a member, then check again.');
      }
    } catch (e) {
      Alert.alert('Could not check', getReadableError(e));
    } finally {
      setLoading(false);
    }
  };

  const explain = () =>
    Alert.alert(
      'How linking works',
      `Gyms using Fitsera add members by phone number. When your gym adds ${
        user?.phone ? user.phone : 'the phone number on your account'
      }, your membership appears here automatically. You can then check in by scanning the QR code at the front desk, see your streak, and get diet plans from your trainer.`,
    );

  return (
    <Screen contentStyle={{ flexGrow: 1 }}>
      <PageTitle title="Gym" />
      <View style={styles.center}>
        <View style={styles.badge}>
          <Icon name="gym" size={36} strokeWidth={1.5} />
        </View>
        <View style={{ gap: 8 }}>
          <Txt style={styles.title}>No gym linked yet</Txt>
          <Txt style={styles.body}>
            Ask your gym to add your phone number as a member. Then you can check in with a scan and keep your
            streak going.
          </Txt>
        </View>
        <View style={styles.actions}>
          <Button title="Check again" onPress={retry} loading={loading} />
          <Button title="How linking works" variant="ghost" onPress={explain} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 480, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 16 },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FONT_FAMILY, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  body: { fontFamily: FONT_FAMILY, fontSize: 15, lineHeight: 22, color: colors.label2, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 8 },
});
