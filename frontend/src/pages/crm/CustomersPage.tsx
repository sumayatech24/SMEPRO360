import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';

const CustomersPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    company_name: '', customer_type: 'b2b', industry: '', gstin: '', credit_limit: 0,
    credit_days: 30, city: '', state: '', phone: '', email: '', segment: ''
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/customers', { params: { search, limit: 50 } });
      setItems(res?.data?.items || []);
    } catch (e) {} finally { setLoading(false); }
  }, [search]);

  const fetchStats = async () => {
    try { const res = await api.get('/crm/customers/stats'); setStats(res.data); } catch {}
  };

  useEffect(() => { fetch(); fetchStats(); }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/crm/customers/${editItem.id}`, form);
      else await api.post('/crm/customers', form);
      setShowModal(false); setEditItem(null); fetch(); fetchStats();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({ company_name: item.company_name, customer_type: item.customer_type, industry: item.industry || '',
      gstin: item.gstin || '', credit_limit: item.credit_limit || 0, credit_days: item.credit_days || 30,
      city: item.city || '', state: item.state || '', phone: item.phone || '', email: item.email || '', segment: item.segment || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this customer?')) { await api.delete(`/crm/customers/${id}`); fetch(); }
  };

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const columns = [
    { key: 'customer_number', title: 'Customer #', render: (r: any) => <span className="font-mono text-indigo-600 text-xs">{r.customer_number}</span> },
    { key: 'company_name', title: 'Company', render: (r: any) => <div><div className="font-medium">{r.company_name}</div><div className="text-xs text-slate-500">{r.email}</div></div> },
    { key: 'industry', title: 'Industry' },
    { key: 'customer_type', title: 'Type', render: (r: any) => <Badge label={r.customer_type} /> },
    { key: 'city', title: 'Location', render: (r: any) => `${r.city || ''} ${r.state || ''}` },
    { key: 'credit_limit', title: 'Credit Limit', render: (r: any) => `₹${r.credit_limit?.toLocaleString('en-IN')}` },
    { key: 'status', title: 'Status', render: (r: any) => <Badge label={r.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">Customers</h1><p className="text-slate-500 text-sm">Manage your customer accounts</p></div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Customers" value={stats.total || 0} icon="🤝" color="indigo" />
        <StatCard title="B2B" value={stats.by_type?.b2b || 0} icon="🏢" color="cyan" />
        <StatCard title="B2C" value={stats.by_type?.b2c || 0} icon="👤" color="purple" />
      </div>

      <DataTable title="All Customers" columns={columns} data={items} loading={loading}
        onAdd={() => { setForm({ company_name:'',customer_type:'b2b',industry:'',gstin:'',credit_limit:0,credit_days:30,city:'',state:'',phone:'',email:'',segment:'' }); setEditItem(null); setShowModal(true); }}
        addLabel="Add Customer" onExport={() => downloadExcel('/crm/customers/export', 'customers.xlsx')}
        onSearch={setSearch} searchPlaceholder="Search customers..."
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
            <button onClick={() => handleDelete(row.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
          </>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Customer' : 'Add Customer'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-medium text-slate-700 mb-1 block">Company Name *</label>
            <input required value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Type</label>
            <select value={form.customer_type} onChange={e => setForm({...form, customer_type: e.target.value})} className={inp}>
              <option value="b2b">B2B</option><option value="b2c">B2C</option><option value="government">Government</option>
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Industry</label>
            <input value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">GSTIN</label>
            <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Credit Limit (₹)</label>
            <input type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Credit Days</label>
            <input type="number" value={form.credit_days} onChange={e => setForm({...form, credit_days: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">State</label>
            <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={inp} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2 gradient-bg text-white rounded-lg text-sm font-medium">{editItem ? 'Update' : 'Create'} Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
