import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
});
