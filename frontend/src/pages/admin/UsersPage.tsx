import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface User { id: number; email: string; full_name: string; username: string; is_active: boolean; is_superuser: boolean; created_at: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ email: '', full_name: '', password: '', is_superuser: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/users/', { params: { limit: 100 } });
      setUsers(r.data.items || r.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.email || !form.password || !form.full_name) return toast.error('Fill all required fields');
    try {
      await api.post('/users/', { ...form, username: form.email.split('@')[0] });
      toast.success('User created!'); setModalOpen(false); load();
      setForm({ email: '', full_name: '', password: '', is_superuser: false });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to create user'); }
  };

  const toggleActive = async (user: User) => {
    await api.put(`/users/${user.id}`, { is_active: !user.is_active });
    toast.success(user.is_active ? 'User deactivated' : 'User activated'); load();
  };

  const filtered = users.filter(u => !filter ||
    u.email?.toLowerCase().includes(filter.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  const columns = [
    { key: 'full_name', title: 'Full Name', render: (r: User) => <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">{r.full_name?.[0] || 'U'}</div><span className="font-medium">{r.full_name}</span></div> },
    { key: 'email', title: 'Email', render: (r: User) => <a href={`mailto:${r.email}`} className="text-indigo-600 hover:underline">{r.email}</a> },
    { key: 'username', title: 'Username', render: (r: User) => <span className="font-mono text-sm">{r.username || '-'}</span> },
    { key: 'is_superuser', title: 'Role', render: (r: User) => <Badge label={r.is_superuser ? 'Admin' : 'User'} color={r.is_superuser ? 'indigo' : 'gray'} /> },
    { key: 'is_active', title: 'Status', render: (r: User) => <Badge label={r.is_active ? 'Active' : 'Inactive'} color={r.is_active ? 'green' : 'red'} /> },
    { key: 'created_at', title: 'Joined', render: (r: User) => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Users</h1><p className="text-slate-500 text-sm mt-1">Manage system users and access control</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add User</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Active', value: users.filter(u => u.is_active).length },
          { label: 'Admins', value: users.filter(u => u.is_superuser).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="System Users"
        onSearch={setFilter} searchPlaceholder="Search users..."
        onAdd={() => setModalOpen(true)} addLabel="Add User"
        actions={(row: User) => (
          <button onClick={() => toggleActive(row)} className={`text-xs px-3 py-1.5 rounded-lg ${row.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create User" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_admin" checked={form.is_superuser} onChange={e => setForm(f => ({ ...f, is_superuser: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
            <label htmlFor="is_admin" className="text-sm text-slate-700">Grant admin privileges</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create User</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
