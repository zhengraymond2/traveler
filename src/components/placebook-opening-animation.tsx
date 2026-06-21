import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { PLACEBOOK_RED, PLACEBOOK_WHITE, placebookWordmarkFont } from '@/constants/placebook-brand';

const DURATION = 1700;

const overlayKeyframe = new Keyframe({
  0: {
    opacity: 1,
  },
  82: {
    opacity: 1,
  },
  100: {
    opacity: 0,
    easing: Easing.out(Easing.cubic),
  },
});

const markKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.72 }],
  },
  25: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
    easing: Easing.elastic(0.8),
  },
  55: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  100: {
    opacity: 1,
    transform: [{ scale: 0.98 }],
  },
});

const routeKeyframe = new Keyframe({
  0: {
    transform: [{ scaleX: 0 }],
  },
  44: {
    transform: [{ scaleX: 0 }],
  },
  68: {
    transform: [{ scaleX: 1 }],
    easing: Easing.out(Easing.cubic),
  },
  100: {
    transform: [{ scaleX: 1 }],
  },
});

const pinKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: -52 }, { rotate: '45deg' }],
  },
  34: {
    opacity: 0,
    transform: [{ translateY: -52 }, { rotate: '45deg' }],
  },
  58: {
    opacity: 1,
    transform: [{ translateY: 0 }, { rotate: '45deg' }],
    easing: Easing.elastic(0.8),
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { rotate: '45deg' }],
  },
});

const wordmarkKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 22 }],
  },
  62: {
    opacity: 0,
    transform: [{ translateY: 22 }],
  },
  84: {
    opacity: 1,
    transform: [{ translateY: 0 }],
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
});

export function PlacebookOpeningAnimation() {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), DURATION);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" entering={overlayKeyframe.duration(DURATION)} style={styles.overlay}>
      <Animated.View entering={markKeyframe.duration(DURATION)} style={styles.brandMark}>
        <View style={[styles.bookPage, styles.leftPage]} />
        <View style={[styles.bookPage, styles.rightPage]} />
        <View style={styles.bookFold} />
        <Animated.View entering={routeKeyframe.duration(DURATION)} style={styles.route} />
        <Animated.View entering={pinKeyframe.duration(DURATION)} style={styles.pin}>
          <View style={styles.pinCutout} />
        </Animated.View>
      </Animated.View>
      <Animated.View entering={wordmarkKeyframe.duration(DURATION)} style={styles.wordmarkWrap}>
        <Text allowFontScaling={false} style={[styles.wordmark, placebookWordmarkFont]}>
          Placebook
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLACEBOOK_RED,
  },
  brandMark: {
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -60,
  },
  bookPage: {
    position: 'absolute',
    top: 28,
    width: 62,
    height: 98,
    borderRadius: 18,
    backgroundColor: PLACEBOOK_WHITE,
  },
  leftPage: {
    left: 16,
    opacity: 0.92,
    transform: [{ rotate: '-5deg' }],
  },
  rightPage: {
    right: 16,
    opacity: 0.82,
    transform: [{ rotate: '5deg' }],
  },
  bookFold: {
    position: 'absolute',
    top: 34,
    width: 5,
    height: 104,
    borderRadius: 3,
    backgroundColor: PLACEBOOK_RED,
  },
  route: {
    position: 'absolute',
    top: 86,
    left: 34,
    width: 86,
    height: 8,
    borderRadius: 4,
    backgroundColor: PLACEBOOK_WHITE,
  },
  pin: {
    position: 'absolute',
    top: 48,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
    borderBottomLeftRadius: 31,
    backgroundColor: PLACEBOOK_WHITE,
  },
  pinCutout: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: PLACEBOOK_RED,
  },
  wordmarkWrap: {
    marginTop: 30,
  },
  wordmark: {
    color: PLACEBOOK_WHITE,
    fontSize: 47,
    lineHeight: 56,
  },
});
