/**
 * Hook for permission checks in components.
 * Usage:
 *   const { can, isSuperuser } = usePermission();
 *   if (can('leads', 'create')) { ... }
 */
import { useEffect } from 'react';
import { usePermissionStore } from '../store/permissionStore';

export function usePermission() {
  const { can, isSuperuser, roles, loaded, load } = usePermissionStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return { can, isSuperuser, roles, loaded };
}

export default usePermission;
