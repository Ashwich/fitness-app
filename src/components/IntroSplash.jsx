import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';

// Must match the native launch screen colour in app.config.js so the
// hand-off from the OS splash to this animation is seamless.
export const INTRO_BG = '#F3EFE6';

// Keep the native splash up until the Lottie view has mounted.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Safety net: never block the app if the animation fails to report finishing.
const MAX_INTRO_MS = 4500;

/**
 * Full-screen animated logo shown on every cold start. Renders as an overlay
 * so the app (auth restore, bootstrap fetches) loads underneath in parallel.
 */
export const IntroSplash = ({ onFinish }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const [done, setDone] = useState(false);
  const finishing = useRef(false);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setDone(true);
      onFinish?.();
    });
  }, [opacity, onFinish]);

  useEffect(() => {
    const t = setTimeout(finish, MAX_INTRO_MS);
    return () => clearTimeout(t);
  }, [finish]);

  if (done) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      <LottieView
        source={require('../../assets/fitsera_logo_intro.json')}
        autoPlay
        loop={false}
        resizeMode="contain"
        onAnimationFinish={finish}
        onAnimationFailure={finish}
        style={styles.anim}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: INTRO_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  anim: {
    width: '78%',
    aspectRatio: 829 / 738,
  },
});

export default IntroSplash;
