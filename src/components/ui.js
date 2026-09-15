import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

export function Avatar({ initials, size = 48, color = '#DDE8FF', online = false }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.31 }]}>{initials}</Text>
      </View>
      {online ? <View style={[styles.online, { right: size * 0.02, bottom: size * 0.04 }]} /> : null}
    </View>
  );
}

export function IconButton({ name, onPress, badge, dark = false, size = 42 }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.iconButton, { width: size, height: size }, dark && styles.iconButtonDark]}>
      <Ionicons name={name} size={20} color={dark ? colors.white : colors.ink} />
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Pill({ children, active = false, icon, onPress }) {
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : colors.green} /> : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{children}</Text>
    </>
  );
  if (onPress) return <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>{content}</Pressable>;
  return <View style={[styles.pill, active && styles.pillActive]}>{content}</View>;
}

export function PrimaryButton({ children, onPress, icon, disabled, compact = false }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primary, compact && styles.primaryCompact, pressed && styles.pressed, disabled && styles.disabled]}>
      {typeof children === 'string' ? <Text style={styles.primaryText}>{children}</Text> : children}
      {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
    </Pressable>
  );
}

export function EmptyState({ icon, title, detail }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.green} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

export function InAppNotificationBanner({ notification, onDismiss }) {
  const [translateY] = useState(() => new Animated.Value(-120));

  useEffect(() => {
    if (!notification) return undefined;
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }).start();
    return () => { Animated.timing(translateY, { toValue: -120, duration: 160, useNativeDriver: true }).start(); };
  }, [notification, translateY]);

  if (!notification) return null;
  return <Animated.View style={[styles.notificationBanner, { transform: [{ translateY }] }]}><View style={styles.notificationBannerIcon}><Ionicons name={notification.icon || 'notifications-outline'} size={19} color={colors.forest} /></View><View style={styles.notificationBannerCopy}><Text numberOfLines={1} style={styles.notificationBannerTitle}>{notification.title || 'New StudentNet update'}</Text><Text numberOfLines={2} style={styles.notificationBannerDetail}>{notification.detail || notification.body || notification.message || 'You have a new notification.'}</Text></View><Pressable accessibilityRole="button" onPress={onDismiss} hitSlop={10} style={styles.notificationBannerClose}><Ionicons name="close" size={18} color={colors.muted} /></Pressable></Animated.View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '800', letterSpacing: -0.4 },
  online: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#3DAA75', borderWidth: 2, borderColor: colors.white },
  iconButton: { borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  iconButtonDark: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.15)' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  action: { color: colors.green, fontSize: 13, fontWeight: '700' },
  pill: { flexDirection: 'row', gap: 6, paddingHorizontal: 13, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  pillText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: colors.white },
  primary: { minHeight: 52, borderRadius: 17, paddingHorizontal: 20, backgroundColor: colors.forest, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', ...shadow },
  primaryCompact: { minHeight: 40, borderRadius: 13, paddingHorizontal: 16 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  empty: { padding: 34, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  emptyDetail: { textAlign: 'center', fontSize: 13, lineHeight: 19, color: colors.muted },
  notificationBanner: { position: 'absolute', top: 14, left: 14, right: 14, zIndex: 100, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 8 },
  notificationBannerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  notificationBannerCopy: { flex: 1 }, notificationBannerTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, notificationBannerDetail: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 3 }, notificationBannerClose: { padding: 4 },
});
