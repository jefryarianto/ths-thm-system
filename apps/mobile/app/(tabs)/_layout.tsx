import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import apiClient from '../../src/lib/api-client';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

export default function TabLayout() {
  const [activeKegiatanCount, setActiveKegiatanCount] = useState(0);

  useEffect(() => {
    const fetchActiveKegiatan = async () => {
      try {
        // Fetch active (published) activities — trainings don't have status field
        const actRes = await apiClient.get('/activities', { params: { status: 'published', limit: 5 } });
        const actCount = Array.isArray(actRes.data?.data) ? actRes.data.data.length : 0;
        setActiveKegiatanCount(actCount);
      } catch {
        /* ignore */
      }
    };

    fetchActiveKegiatan();

    // Poll setiap 30 detik
    const interval = setInterval(() => {
      fetchActiveKegiatan();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb' },
      }}
    >
      {/* Halaman ini tetap ada tapi tidak tampil di tab bar (diakses dari shortcut Beranda) */}
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="dues" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />

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
        name="digital-card"
        options={{
          tabBarLabel: 'Kartu',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr-scan"
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={size} color={color} />
              <Badge count={activeKegiatanCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gamification"
        options={{
          tabBarLabel: 'Poin',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
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
