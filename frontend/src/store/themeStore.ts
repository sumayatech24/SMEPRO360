import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark;
        set({ isDark: next });
        applyTheme(next);
      },
      setDark: (v) => { set({ isDark: v }); applyTheme(v); },
    }),
    { name: 'smepro360-theme' }
  )
);

export function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Apply on init
const stored = localStorage.getItem('smepro360-theme');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    if (state?.isDark) applyTheme(true);
  } catch {}
}
