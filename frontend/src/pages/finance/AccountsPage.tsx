import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  current_balance: number;
  opening_balance: number;
  code?: string;
  name?: string;
  balance?: number;
  is_active: boolean;
  description?: string;
}

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];
const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-50 text-blue-600', liability: 'bg-red-50 text-red-600',
  equity: 'bg-purple-50 text-purple-600', income: 'bg-green-50 text-green-600',
  expense: 'bg-orange-50 text-orange-600',
};

const emptyForm = { code: '', name: '', account_type: 'asset', description: '' };

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50, skip: (page - 1) * 50 };
      if (search) params.search = search;
      if (filterType) params.account_type = filterType;
      const res = await api.get('/finance/accounts', { params });
      const data = res.data;
      if (Array.isArray(data)) { setAccounts(data); setTotal(data.length); }
      else { setAccounts(data.items || []); setTotal(data.total || 0); }
    } catch {}
    setLoading(false);
  }, [page, search, filterType]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ code: a.account_code || a.code, name: a.account_name || a.name, account_type: a.account_type, description: a.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await api.put(`/finance/accounts/${editing.id}`, form);
      else await api.post('/finance/accounts', form);
      setShowModal(false);
      fetchAccounts();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Save failed');
    }
    setSaving(false);
  };

  const columns = [
    { key: 'account_code', title: 'Code', render: (row: Account) => <span className="font-mono text-indigo-600 font-semibold">{row.account_code || row.code}</span> },
    { key: 'account_name', title: 'Account Name', render: (row: Account) => <span className="font-medium text-slate-800">{row.account_name || row.name}</span> },
    {
      key: 'account_type', title: 'Type', render: (row: Account) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${TYPE_COLORS[row.account_type] || 'bg-slate-50 text-slate-600'}`}>{row.account_type}</span>
      )
    },
    {
      key: 'current_balance', title: 'Balance', render: (row: Account) => {
        const bal = row.current_balance ?? row.balance ?? 0;
        return <span className={`font-semibold ${bal < 0 ? 'text-red-600' : 'text-slate-800'}`}>₹{bal.toLocaleString('en-IN')}</span>;
      }
    },
    { key: 'is_active', title: 'Status', render: (row: Account) => <Badge label={row.is_active ? 'active' : 'inactive'} /> },
  ];

  const bal = (a: Account) => a.current_balance ?? a.balance ?? 0;
  const totalAssets = accounts.filter(a => a.account_type === 'asset').reduce((s, a) => s + bal(a), 0);
  const totalIncome = accounts.filter(a => a.account_type === 'revenue' || a.account_type === 'income').reduce((s, a) => s + bal(a), 0);
  const totalExpenses = accounts.filter(a => a.account_type === 'expense').reduce((s, a) => s + bal(a), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm">Manage your accounting structure</p>
        </div>
        <button onClick={() => downloadExcel('/finance/accounts/export', 'accounts.xlsx')}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300">
          📥 Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: total, icon: '📒', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Total Assets', value: `₹${(totalAssets / 100000).toFixed(1)}L`, icon: '🏦', color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Income', value: `₹${(totalIncome / 100000).toFixed(1)}L`, icon: '📈', color: 'text-green-600 bg-green-50' },
          { label: 'Total Expenses', value: `₹${(totalExpenses / 100000).toFixed(1)}L`, icon: '📉', color: 'text-red-600 bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${stat.color}`}>{stat.icon}</div>
            <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-indigo-300">
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      <DataTable
        title="Accounts"
        columns={columns}
        data={accounts}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onAdd={openCreate}
        addLabel="+ New Account"
        actions={(row) => (
          <button onClick={() => openEdit(row)} className="text-xs text-indigo-600 hover:underline">Edit</button>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Account' : 'New Account'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">Account Code *</label>
              <input value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400"
                placeholder="e.g. 1001" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Account Type *</label>
              <select value={form.account_type} onChange={e => setForm((f: any) => ({ ...f, account_type: e.target.value }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Account Name *</label>
            <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              placeholder="e.g. Cash & Bank" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Description</label>
            <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-400" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 gradient-bg text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsPage;
