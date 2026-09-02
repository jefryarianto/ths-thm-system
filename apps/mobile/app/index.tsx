import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO = require('../assets/images/logo.png');

function SplashScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[splashStyles.container, { paddingTop: insets.top }]}>
      <Animated.View
        style={[
          splashStyles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <Animated.Image source={LOGO} style={splashStyles.logo} resizeMode="contain" />
        <Text style={splashStyles.title}>THS-THM</Text>
        <Text style={splashStyles.subtitle}>Tunggal Hati Seminari - Tunggal Hati Maria</Text>
        <Text style={splashStyles.tagline}>Organisasi Pencak Silat Pendidikan</Text>
        <Text style={splashStyles.version}>v1.0.1</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bfdbfe',
    marginBottom: 4,
  },
  version: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 24,
    fontWeight: '400',
  },
  tagline: {
    fontSize: 12,
    color: '#93c5fd',
  },
});

export default function Index() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  const isLoading = useAuthStore((s: AuthState) => s.isLoading);

  if (isLoading) {
    return <SplashScreen />;
  }

  return isAuthenticated ? (
    <Redirect href={'/(tabs)/home' as any} />
  ) : (
    <Redirect href={'/login' as any} />
  );
}
