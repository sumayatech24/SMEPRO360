import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Role {
  id: number; name: string; display_name: string; description: string;
  color: string; is_system: boolean; is_active: boolean;
  permission_count: number; user_count: number;
  permissions?: string[];
  permissions_detail?: Permission[];
}

interface Permission {
  id: number; name: string; module: string; action: string;
  description: string; confidentiality: string;
}

interface User {
  id: number; email: string; full_name: string; is_superuser: boolean;
  roles: { id: number; name: string; display_name: string; color: string }[];
}

const CONFIDENTIALITY_COLORS: Record<string, string> = {
  public: 'green', internal: 'blue', confidential: 'yellow', restricted: 'red',
};

const MODULE_ICONS: Record<string, string> = {
  dashboard: '📊', leads: '🎯', crm: '🤝', sales: '🛒', procurement: '📦',
  inventory: '🏭', manufacturing: '⚙️', finance: '💰', hr: '👥',
  projects: '🚀', helpdesk: '🎫', assets: '🖥️', quality: '✅',
  documents: '📁', reports: '📈', admin: '⚙️',
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'roles' | 'matrix' | 'users'>('roles');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRoleModal, setEditRoleModal] = useState<Role | null>(null);
  const [permModalRole, setPermModalRole] = useState<Role | null>(null);
  const [userRoleModal, setUserRoleModal] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState('');

  // Form state
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '', color: '#6366f1' });
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());
  const [permModule, setPermModule] = useState('');
  const [selectedUserRoles, setSelectedUserRoles] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes, uRes, mRes] = await Promise.all([
        api.get('/admin/rbac/roles'),
        api.get('/admin/rbac/permissions'),
        api.get('/admin/rbac/users/with-roles'),
        api.get('/admin/rbac/matrix'),
      ]);
      setRoles(rRes.data);
      setPermissions(pRes.data);
      setUsers(uRes.data);
      setMatrix(mRes.data);
      const mods = [...new Set(pRes.data.map((p: Permission) => p.module))].sort();
      setModules(mods as string[]);
    } catch (e: any) {
      toast.error('Failed to load RBAC data: ' + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRole = async () => {
    if (!newRole.name || !newRole.display_name) return toast.error('Fill required fields');
    try {
      await api.post('/admin/rbac/roles', newRole);
      toast.success('Role created!'); setCreateModalOpen(false); load();
      setNewRole({ name: '', display_name: '', description: '', color: '#6366f1' });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const deleteRole = async (role: Role) => {
    if (role.is_system) return toast.error('System roles cannot be deleted');
    if (!window.confirm(`Deactivate role "${role.display_name}"?`)) return;
    try {
      await api.delete(`/admin/rbac/roles/${role.id}`);
      toast.success('Role deactivated'); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const openPermModal = async (role: Role) => {
    const detail = await api.get(`/admin/rbac/roles/${role.id}`);
    const r: Role = detail.data;
    setPermModalRole(r);
    setSelectedPerms(new Set((r.permissions_detail || []).map(p => p.id)));
    setPermModule('');
  };

  const savePermissions = async () => {
    if (!permModalRole) return;
    try {
      await api.put(`/admin/rbac/roles/${permModalRole.id}/permissions`, {
        permission_ids: Array.from(selectedPerms),
      });
      toast.success('Permissions updated!');
      setPermModalRole(null); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const openUserRoleModal = (user: User) => {
    setUserRoleModal(user);
    setSelectedUserRoles(new Set(user.roles.map(r => r.id)));
  };

  const saveUserRoles = async () => {
    if (!userRoleModal) return;
    try {
      await api.put(`/admin/rbac/users/${userRoleModal.id}/roles`, {
        role_ids: Array.from(selectedUserRoles),
      });
      toast.success('Roles updated for ' + userRoleModal.full_name);
      setUserRoleModal(null); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const togglePerm = (id: number) => setSelectedPerms(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllModule = (mod: string, allSelected: boolean) => {
    const modPerms = permissions.filter(p => p.module === mod);
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modPerms.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const filteredPerms = permModule ? permissions.filter(p => p.module === permModule) : permissions;
  const filteredRoles = roles.filter(r => !roleFilter ||
    r.name.includes(roleFilter.toLowerCase()) ||
    r.display_name.toLowerCase().includes(roleFilter.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading roles & permissions...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Roles & Permissions</h1>
          <p className="text-slate-500 text-sm mt-1">
            {roles.length} roles · {permissions.length} permissions · {users.length} users
          </p>
        </div>
        <button onClick={() => setCreateModalOpen(true)}
          className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">
          + Create Role
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Roles', value: roles.length, icon: '🎭' },
          { label: 'Permissions', value: permissions.length, icon: '🔐' },
          { label: 'Modules', value: modules.length, icon: '📦' },
          { label: 'Users Assigned', value: users.filter(u => u.roles.length > 0).length, icon: '👥' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['roles', 'matrix', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t === 'roles' ? '🎭 Roles' : t === 'matrix' ? '📊 Permission Matrix' : '👥 Users & Roles'}
          </button>
        ))}
      </div>

      {/* ── ROLES TAB ── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <input placeholder="Search roles..." value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-64" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Color bar */}
                <div className="h-1.5" style={{ backgroundColor: role.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{role.display_name}</span>
                        {role.is_system && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">System</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">{role.name}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: role.color }}>
                      {role.display_name[0]}
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description}</p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      {role.permission_count} permissions
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      {role.user_count} users
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openPermModal(role)}
                      className="flex-1 text-xs px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium">
                      Manage Permissions
                    </button>
                    {!role.is_system && (
                      <button onClick={() => deleteRole(role)}
                        className="text-xs px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PERMISSION MATRIX TAB ── */}
      {tab === 'matrix' && matrix && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Permission Matrix</h2>
            <p className="text-xs text-slate-500 mt-1">Green = Permission granted · Gray = Not granted</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 border-r border-slate-200 min-w-[160px]">
                    Module / Role
                  </th>
                  {matrix.roles.map((r: any) => (
                    <th key={r.name} className="px-3 py-3 text-center min-w-[90px]">
                      <div className="w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: r.color }}>
                        {r.display_name?.[0]}
                      </div>
                      <div className="text-slate-600 font-medium leading-tight" style={{ fontSize: '10px' }}>
                        {r.display_name?.split(' ')[0]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.modules.map((mod: string) => {
                  const actions = Object.keys(matrix.matrix[mod]?.[matrix.roles[0]?.name] || {});
                  return actions.map((action, ai) => (
                    <tr key={`${mod}-${action}`} className={`border-t border-slate-50 ${ai === 0 ? 'border-t-2 border-slate-200' : ''}`}>
                      <td className="px-4 py-2 sticky left-0 bg-white border-r border-slate-100">
                        {ai === 0 && (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <span>{MODULE_ICONS[mod] || '📌'}</span>
                            <span className="capitalize">{mod}</span>
                          </div>
                        )}
                        {ai > 0 && (
                          <span className="text-slate-400 pl-5">{action.replace('_', ' ')}</span>
                        )}
                        {ai === 0 && (
                          <span className="text-slate-400 text-xs pl-1">— {action.replace('_', ' ')}</span>
                        )}
                      </td>
                      {matrix.roles.map((r: any) => {
                        const hasIt = matrix.matrix[mod]?.[r.name]?.[action];
                        return (
                          <td key={r.name} className="px-3 py-2 text-center">
                            {hasIt ? (
                              <span className="inline-block w-4 h-4 rounded-full bg-green-400" title={`${r.name} has ${mod}:${action}`} />
                            ) : (
                              <span className="inline-block w-4 h-4 rounded-full bg-slate-100" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">User Role Assignments</h2>
            <span className="text-sm text-slate-500">{users.length} users</span>
          </div>
          <div className="divide-y divide-slate-50">
            {users.map(user => (
              <div key={user.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {user.full_name?.[0] || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{user.full_name}</div>
                  <div className="text-sm text-slate-500">{user.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {user.is_superuser && (
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg font-medium">
                      Super Admin
                    </span>
                  )}
                  {user.roles.map(r => (
                    <span key={r.id} className="text-xs px-2 py-1 rounded-lg text-white font-medium"
                      style={{ backgroundColor: r.color }}>
                      {r.display_name}
                    </span>
                  ))}
                  {user.roles.length === 0 && !user.is_superuser && (
                    <span className="text-xs text-slate-400 italic">No roles assigned</span>
                  )}
                </div>
                <button onClick={() => openUserRoleModal(user)}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium whitespace-nowrap">
                  Assign Roles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE ROLE MODAL ── */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Role" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role Key *</label>
            <input value={newRole.name} onChange={e => setNewRole(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              placeholder="e.g. regional_manager"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <p className="text-xs text-slate-400 mt-1">Lowercase, underscores only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
            <input value={newRole.display_name} onChange={e => setNewRole(f => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Regional Manager"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={newRole.description} onChange={e => setNewRole(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={newRole.color} onChange={e => setNewRole(f => ({ ...f, color: e.target.value }))}
                className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
              <span className="text-sm text-slate-500">{newRole.color}</span>
              <div className="flex gap-2">
                {['#6366f1','#ef4444','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#64748b'].map(c => (
                  <button key={c} onClick={() => setNewRole(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: newRole.color === c ? '#1e293b' : 'transparent' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setCreateModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={createRole} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Role</button>
          </div>
        </div>
      </Modal>

      {/* ── PERMISSIONS MODAL ── */}
      {permModalRole && (
        <Modal isOpen={!!permModalRole} onClose={() => setPermModalRole(null)} title={`Permissions — ${permModalRole.display_name}`} size="xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-white text-sm font-medium" style={{ backgroundColor: permModalRole.color }}>
                {permModalRole.display_name}
              </div>
              <span className="text-sm text-slate-500">{selectedPerms.size} permissions selected</span>
            </div>

            {/* Module filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPermModule('')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!permModule ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                All Modules
              </button>
              {modules.map(mod => {
                const modPerms = permissions.filter(p => p.module === mod);
                const selectedCount = modPerms.filter(p => selectedPerms.has(p.id)).length;
                return (
                  <button key={mod} onClick={() => setPermModule(mod === permModule ? '' : mod)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      permModule === mod ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {MODULE_ICONS[mod]} {mod}
                    <span className={`px-1.5 rounded-full text-xs ${selectedCount === modPerms.length ? 'bg-green-500 text-white' : selectedCount > 0 ? 'bg-yellow-400 text-white' : 'bg-slate-300 text-slate-600'}`}>
                      {selectedCount}/{modPerms.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Permissions list */}
            <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
              {permModule && (
                <div className="px-4 py-2 bg-slate-50 flex items-center justify-between sticky top-0">
                  <span className="text-xs font-semibold text-slate-600 uppercase">{permModule} module</span>
                  <button onClick={() => {
                    const modPerms = permissions.filter(p => p.module === permModule);
                    const allSelected = modPerms.every(p => selectedPerms.has(p.id));
                    toggleAllModule(permModule, allSelected);
                  }} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">
                    {permissions.filter(p => p.module === permModule).every(p => selectedPerms.has(p.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              )}
              {filteredPerms.map(perm => (
                <label key={perm.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedPerms.has(perm.id)} onChange={() => togglePerm(perm.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-slate-300" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-indigo-600">{perm.name}</span>
                      <Badge label={perm.confidentiality} color={CONFIDENTIALITY_COLORS[perm.confidentiality] as any} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setPermModalRole(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={savePermissions} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">
                Save {selectedPerms.size} Permissions
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── USER ROLES MODAL ── */}
      {userRoleModal && (
        <Modal isOpen={!!userRoleModal} onClose={() => setUserRoleModal(null)} title={`Assign Roles — ${userRoleModal.full_name}`} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
                {userRoleModal.full_name?.[0]}
              </div>
              <div>
                <div className="font-medium text-slate-800">{userRoleModal.full_name}</div>
                <div className="text-sm text-slate-500">{userRoleModal.email}</div>
              </div>
            </div>

            <p className="text-sm text-slate-500">Select the roles to assign to this user:</p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {roles.map(role => (
                <label key={role.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  selectedUserRoles.has(role.id) ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:border-slate-200'
                }`}>
                  <input type="checkbox" checked={selectedUserRoles.has(role.id)}
                    onChange={() => setSelectedUserRoles(prev => { const next = new Set(prev); next.has(role.id) ? next.delete(role.id) : next.add(role.id); return next; })}
                    className="w-4 h-4 rounded text-indigo-600" />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: role.color }}>
                    {role.display_name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">{role.display_name}</div>
                    <div className="text-xs text-slate-400">{role.permission_count} permissions</div>
                  </div>
                  {role.is_system && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">System</span>}
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setUserRoleModal(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveUserRoles} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">
                Save Roles ({selectedUserRoles.size} selected)
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
