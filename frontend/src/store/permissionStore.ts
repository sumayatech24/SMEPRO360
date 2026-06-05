/**
 * Permission store — caches the current user's permissions from the API.
 * Used by usePermission() hook and ProtectedModule component.
 */
import { create } from 'zustand';
import api from '../api/client';

interface PermissionStore {
  permissions: Set<string>;
  roles: string[];
  isSuperuser: boolean;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  can: (module: string, action: string) => boolean;
  reset: () => void;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  permissions: new Set(),
  roles: [],
  isSuperuser: false,
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const r = await api.get('/admin/rbac/my-permissions');
      set({
        permissions: new Set(r.data.permissions || []),
        roles: r.data.roles || [],
        isSuperuser: r.data.is_superuser || false,
        loaded: true,
      });
    } catch {
      // Fallback: if RBAC endpoint fails (old server), grant all for superusers
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.is_superuser) {
        set({ isSuperuser: true, loaded: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  can: (module: string, action: string): boolean => {
    const { isSuperuser, permissions, loaded } = get();
    if (!loaded || isSuperuser) return true;
    return permissions.has(`${module}:${action}`);
  },

  reset: () => set({ permissions: new Set(), roles: [], isSuperuser: false, loaded: false }),
}));
