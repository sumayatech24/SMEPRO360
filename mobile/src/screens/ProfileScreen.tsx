import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, getTheme } from '../store/themeStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const theme = getTheme(isDark);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'A';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Avatar */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{user?.full_name || 'Admin User'}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
        {user?.is_superuser && (
          <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Super Admin</Text></View>
        )}
      </View>

      {/* Theme Toggle */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <View>
              <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor={isDark ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Menu Items */}
      {[
        { section: 'MY ACCOUNT', items: [
          { icon: '👤', label: 'My Profile', sub: 'View and edit personal info' },
          { icon: '🔒', label: 'Change Password', sub: 'Update your password' },
          { icon: '🌴', label: 'My Leaves', sub: 'View leave balances & apply' },
          { icon: '📅', label: 'My Attendance', sub: 'View attendance history' },
          { icon: '💰', label: 'My Payslips', sub: 'Download monthly payslips' },
        ]},
        { section: 'SETTINGS', items: [
          { icon: '📱', label: 'Notifications', sub: 'Manage push notifications' },
          { icon: '🔔', label: 'Alerts & Reminders', sub: 'Task and leave reminders' },
          { icon: '🌐', label: 'Language', sub: 'English (India)' },
        ]},
        { section: 'SUPPORT', items: [
          { icon: '🆘', label: 'Help & Support', sub: 'Contact support team' },
          { icon: '📋', label: 'About SMEPRO360', sub: 'Version 1.0.0' },
        ]},
      ].map(section => (
        <View key={section.section} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.section}</Text>
          {section.items.map((item, idx) => (
            <TouchableOpacity key={item.label}
              style={[styles.menuItem, idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View>
                  <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>{item.sub}</Text>
                </View>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Logout */}
      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: '#fee2e2' }]} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 8 },
  adminBadge: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3 },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIcon: { fontSize: 22, width: 32 },
  menuLabel: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  menuSubtitle: { fontSize: 12 },
  logoutBtn: { marginHorizontal: 16, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
