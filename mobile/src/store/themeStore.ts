import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: Appearance.getColorScheme() === 'dark',
      toggle: () => set({ isDark: !get().isDark }),
      setDark: (v) => set({ isDark: v }),
    }),
    {
      name: 'smepro360-theme-mobile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ── Theme Colors ──────────────────────────────────────────────────────────────
export const getTheme = (isDark: boolean) => ({
  // Backgrounds
  bg: isDark ? '#0f172a' : '#f8fafc',
  card: isDark ? '#1e293b' : '#ffffff',
  sidebar: isDark ? '#020617' : '#0f172a',
  input: isDark ? '#0f172a' : '#f8fafc',
  header: isDark ? '#1e293b' : '#ffffff',
  // Text
  textPrimary: isDark ? '#f1f5f9' : '#1e293b',
  textSecondary: isDark ? '#94a3b8' : '#64748b',
  textMuted: isDark ? '#64748b' : '#94a3b8',
  // Borders
  border: isDark ? '#334155' : '#e2e8f0',
  // Tab bar
  tabBar: isDark ? '#1e293b' : '#ffffff',
  tabBorder: isDark ? '#334155' : '#e2e8f0',
  // Status bar
  statusBar: isDark ? 'light' : 'dark',
});
