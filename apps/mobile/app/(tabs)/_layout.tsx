import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../src/theme';

/** Tombol Scan QR di tengah tab bar — dinaikkan (raised) dengan lingkaran berisi ikon pemindai. */
function ScanButton({
  onPress,
}: {
  onPress?: (e: import('react-native').GestureResponderEvent | import('react').MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <View style={styles.scanWrap}>
      <TouchableOpacity
        style={styles.scanBtn}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Scan QR"
      >
        <Ionicons name="qr-code" size={26} color={theme.colors.surface} />
      </TouchableOpacity>
      <Text style={styles.scanLabel}>Scan QR</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: theme.colors.text,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -3 },
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      {/* Layar tetap ada tapi tidak tampil di tab bar (diakses dari menu kapsul/shortcut lain) */}
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="gamification" options={{ href: null }} />
      <Tabs.Screen name="digital-card" options={{ href: null }} />

      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dues"
        options={{
          tabBarLabel: 'Iuran',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />
          ),
        }}
      />
      {/* Scan QR — tombol tengah yang dinaikkan (raised center button) untuk verifikasi dokumen/KTA & absensi */}
      <Tabs.Screen
        name="qr-scan"
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <ScanButton onPress={props.onPress} />,
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          tabBarLabel: 'Forum',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanWrap: { alignItems: 'center', marginTop: -24 },
  scanBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  scanLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.primary, marginTop: 2 },
});