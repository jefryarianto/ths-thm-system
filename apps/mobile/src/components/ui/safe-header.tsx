import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import { theme } from '../../theme';

interface SafeHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon: string;
    onPress: () => void;
    badge?: number;
  };
}

export function SafeHeader({ title, subtitle, showBack = false, rightAction }: SafeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
          </TouchableOpacity>
        )}
        <View style={[styles.titleContainer, showBack && styles.titleWithBack]}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
        </View>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.actionBtn}>
            <Ionicons name={safeIconName(rightAction.icon)} size={22} color={theme.colors.textOnPrimary} />
            {rightAction.badge !== undefined && rightAction.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{rightAction.badge > 99 ? '99+' : rightAction.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.header,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg + 2,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  titleWithBack: {
    marginLeft: 0,
  },
  headerTitle: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
  },
  headerSub: {
    color: theme.colors.headerSub,
    fontSize: 13,
    marginTop: 2,
  },
  actionBtn: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.md,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.xs - 1,
    fontWeight: '800',
  },
});
