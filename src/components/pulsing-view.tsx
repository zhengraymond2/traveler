import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type PulsingViewProps = {
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PulsingView({ active, children, style }: PulsingViewProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = active ? withRepeat(withTiming(0.45, { duration: 850 }), -1, true) : withTiming(1);
  }, [active, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
