import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import apiClient from '../../src/lib/api-client';
import { getSocket, disconnectSocket } from '../../src/lib/socket';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/notifications/count');
        setUnreadCount(data.data?.count || 0);
      } catch { /* ignore */ }
    };
    fetchCount();

    // Try WebSocket for real-time updates
    let cleanupFn: (() => void) | undefined;
    (async () => {
      try {
        const socket = await getSocket();
        socket.on('notification:new', () => {
          setUnreadCount((prev) => prev + 1);
        });
        socket.on('notification:count', (data: { count: number }) => {
          setUnreadCount(data.count);
        });
        cleanupFn = () => {
          socket.off('notification:new');
          socket.off('notification:count');
        };
      } catch { /* fallback to polling */ }
    })();

    // Fallback: poll every 30s
    const interval = setInterval(fetchCount, 30000);
    return () => {
      clearInterval(interval);
      cleanupFn?.();
    };
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
      <Tabs.Screen
        name="home"
        options={{ tabBarLabel: 'Beranda', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="digital-card"
        options={{ tabBarLabel: 'Kartu', tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="documents"
        options={{ tabBarLabel: 'Dokumen', tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="dues"
        options={{ tabBarLabel: 'Iuran', tabBarIcon: ({ color, size }) => <Ionicons name="cash" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabel: 'Notifikasi',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications" size={size} color={color} />
              <Badge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="qr-scan"
        options={{ tabBarLabel: 'Scan QR', tabBarIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> }}
      />
    </Tabs>
  );
}