import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { CheckInStatus } from '../types';
import { COLORS } from '../styles/theme';

const STATUS_COLORS: Record<CheckInStatus, string> = {
  okay: COLORS.status.okay,
  pending: COLORS.status.pending,
  need_help: COLORS.status.needHelp,
  idle: COLORS.status.unknown,
};

interface StatusRingProps {
  status: CheckInStatus;
  size: number;
  ringWidth?: number;
}

const StatusRing: React.FC<StatusRingProps> = ({ status, size, ringWidth = 3 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (status === 'pending') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.4,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.9,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else if (status === 'need_help') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(status === 'okay' ? 1 : 0.5);
    }
  }, [status, pulseAnim, opacityAnim]);

  const color = STATUS_COLORS[status];

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: color,
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
});

export default StatusRing;
