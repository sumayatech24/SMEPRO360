import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  gstin?: string;
  is_msme: boolean;
  msme_number?: string;
  payment_terms?: number;
  is_active: boolean;
}

const emptyForm = {
  name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
  gstin: '', pan: '', is_msme: false, msme_number: '', payment_terms: 30,
  bank_account: '', bank_ifsc: '', bank_name: '',
};

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/procurement/vendors', { params: { limit: 20, skip: (page - 1) * 20, search } });
      const data = res.data;
      if (Array.isArray(data)) { setVendors(data); setTotal(data.length); }
      else { setVendors(data.items || []); setTotal(data.total || 0); }
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (v: Vendor) => { setEditing(v); setForm({ ...emptyForm, ...v }); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await api.put(`/procurement/vendors/${editing.id}`, form);
      else await api.post('/procurement/vendors', form);
      setShowModal(false);
      fetch();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Save failed'); }
    setSaving(false);
  };

  const columns = [
    { key: 'name', title: 'Vendor Name', render: (row: Vendor) => <span className="font-semibold text-slate-800">{row.name}</span> },
    { key: 'email', title: 'Email', render: (row: Vendor) => <span className="text-sm text-slate-500">{row.email || '—'}</span> },
    { key: 'phone', title: 'Phone', render: (row: Vendor) => row.phone || '—' },
    { key: 'city', title: 'City', render: (row: Vendor) => row.city || '—' },
    { key: 'gstin', title: 'GSTIN', render: (row: Vendor) => <span className="font-mono text-xs">{row.gstin || '—'}</span> },
    { key: 'is_msme', title: 'MSME', render: (row: Vendor) => row.is_msme ? <Badge label="active" /> : <span className="text-slate-400 text-xs">—</span> },
    { key: 'payment_terms', title: 'Terms', render: (row: Vendor) => row.payment_terms ? `${row.payment_terms}d` : '—' },
    { key: 'is_active', title: 'Status', render: (row: Vendor) => <Badge label={row.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendor Management</h1>
          <p className="text-slate-500 text-sm">Manage suppliers and procurement partners</p>
        </div>
        <button onClick={() => downloadExcel('/procurement/vendors/export', 'vendors.xlsx')}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300">
          📥 Export Excel
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Vendors', value: total, icon: '🏭', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active', value: vendors.filter(v => v.is_active).length, icon: '✅', color: 'text-green-600 bg-green-50' },
          { label: 'MSME Vendors', value: vendors.filter(v => v.is_msme).length, icon: '🏢', color: 'text-blue-600 bg-blue-50' },
          { label: 'Avg Pay Terms', value: vendors.length ? `${Math.round(vendors.reduce((s, v) => s + (v.payment_terms || 0), 0) / vendors.length)}d` : '—', icon: '📅', color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${stat.color}`}>{stat.icon}</div>
            <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <DataTable
        title="Vendors"
        columns={columns}
        data={vendors}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onAdd={openCreate}
        addLabel="+ New Vendor"
        actions={(row) => (
          <button onClick={() => openEdit(row)} className="text-xs text-indigo-600 hover:underline">Edit</button>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Vendor' : 'New Vendor'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'name', label: 'Vendor Name *' },
              { field: 'email', label: 'Email' },
              { field: 'phone', label: 'Phone' },
              { field: 'city', label: 'City' },
              { field: 'state', label: 'State' },
              { field: 'pincode', label: 'Pincode' },
              { field: 'gstin', label: 'GSTIN' },
              { field: 'pan', label: 'PAN' },
              { field: 'bank_name', label: 'Bank Name' },
              { field: 'bank_account', label: 'Account Number' },
              { field: 'bank_ifsc', label: 'IFSC Code' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-sm font-semibold text-slate-600">{label}</label>
                <input value={form[field] || ''} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))}
                  className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-slate-600">Payment Terms (days)</label>
              <input type="number" value={form.payment_terms} onChange={e => setForm((f: any) => ({ ...f, payment_terms: Number(e.target.value) }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_msme" checked={form.is_msme} onChange={e => setForm((f: any) => ({ ...f, is_msme: e.target.checked }))} className="w-4 h-4 text-indigo-600" />
            <label htmlFor="is_msme" className="text-sm font-semibold text-slate-600">MSME Registered Vendor</label>
          </div>
          {form.is_msme && (
            <div>
              <label className="text-sm font-semibold text-slate-600">MSME/Udyam Number</label>
              <input value={form.msme_number || ''} onChange={e => setForm((f: any) => ({ ...f, msme_number: e.target.value }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400" placeholder="UDYAM-XX-00-0000000" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 gradient-bg text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VendorsPage;
