import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Svg, Circle, Rect, Polygon } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

interface Particle {
  id: number;
  color: string;
  x: number;
  size: number;
  shape: 'circle' | 'rect' | 'triangle';
  delay: number;
  duration: number;
}

const NUM_PARTICLES = 40;

function generateParticles(): Particle[] {
  return Array.from({ length: NUM_PARTICLES }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: Math.random() * SCREEN_WIDTH,
    size: 6 + Math.random() * 8,
    shape: (['circle', 'rect', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    delay: Math.random() * 500,
    duration: 1500 + Math.random() * 1500,
  }));
}

function ParticleShape({ shape, size, color }: { shape: string; size: number; color: string }) {
  switch (shape) {
    case 'circle':
      return <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />;
    case 'rect':
      return <Rect x={0} y={0} width={size * 0.8} height={size * 0.8} rx={2} fill={color} />;
    case 'triangle':
      return (
        <Polygon
          points={`${size / 2},0 ${size},${size} 0,${size}`}
          fill={color}
        />
      );
    default:
      return <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />;
  }
}

function ConfettiParticle({ particle, parentOpacity }: { particle: Particle; parentOpacity: Animated.Value }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
        duration: particle.duration,
        delay: particle.delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT * 0.7 + Math.random() * 200,
        duration: particle.duration,
        delay: particle.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 4 - 2,
        duration: particle.duration,
        delay: particle.delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: particle.duration - 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          opacity: parentOpacity,
          transform: [
            { translateX },
            { translateY },
            {
              rotate: rotate.interpolate({
                inputRange: [-2, 2],
                outputRange: ['-180deg', '180deg'],
              }),
            },
            { scale },
          ],
        },
      ]}
    >
      <Svg width={particle.size} height={particle.size}>
        <ParticleShape shape={particle.shape} size={particle.size} color={particle.color} />
      </Svg>
    </Animated.View>
  );
}

interface ConfettiProps {
  visible: boolean;
  onFinish?: () => void;
}

export default function Confetti({ visible, onFinish }: ConfettiProps) {
  const particles = useRef(generateParticles()).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish?.();
      });
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} particle={particle} parentOpacity={opacity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
