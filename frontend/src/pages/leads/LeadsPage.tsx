import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '',
    designation: '', industry: '', source: '', status: 'new', priority: 'medium',
    city: '', state: '', description: ''
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/leads/', { params });
      setLeads(res?.data?.items || []); setTotal(res?.data?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, statusFilter]);

  const fetchStats = async () => {
    try { const res = await api.get('/leads/stats'); setStats(res.data); } catch {}
  };

  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/leads/${editItem.id}`, form);
      } else {
        await api.post('/leads/', form);
      }
      setShowModal(false); setEditItem(null);
      resetForm(); fetchLeads(); fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error saving lead');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this lead?')) {
      await api.delete(`/leads/${id}`); fetchLeads(); fetchStats();
    }
  };

  const handleConvert = async (id: number) => {
    if (window.confirm('Convert this lead to customer?')) {
      try {
        await api.post(`/leads/${id}/convert`);
        alert('Lead converted to customer!'); fetchLeads();
      } catch (e: any) { alert(e.response?.data?.detail); }
    }
  };

  const handleEdit = (lead: any) => {
    setEditItem(lead);
    setForm({ first_name: lead.first_name, last_name: lead.last_name || '', email: lead.email || '',
      phone: lead.phone || '', company: lead.company || '', designation: lead.designation || '',
      industry: lead.industry || '', source: lead.source || '', status: lead.status,
      priority: lead.priority, city: lead.city || '', state: lead.state || '',
      description: lead.description || '' });
    setShowModal(true);
  };

  const resetForm = () => setForm({
    first_name: '', last_name: '', email: '', phone: '', company: '',
    designation: '', industry: '', source: '', status: 'new', priority: 'medium',
    city: '', state: '', description: ''
  });

  const columns = [
    { key: 'lead_number', title: 'Lead #', render: (r: any) => <span className="font-mono text-indigo-600 text-xs">{r.lead_number}</span> },
    { key: 'name', title: 'Name', render: (r: any) => (
      <div>
        <div className="font-medium text-slate-800">{r.first_name} {r.last_name}</div>
        <div className="text-xs text-slate-500">{r.email}</div>
      </div>
    )},
    { key: 'company', title: 'Company', render: (r: any) => <div><div className="font-medium">{r.company}</div><div className="text-xs text-slate-500">{r.designation}</div></div> },
    { key: 'source', title: 'Source', render: (r: any) => r.source || '—' },
    { key: 'status', title: 'Status', render: (r: any) => <Badge label={r.status} /> },
    { key: 'priority', title: 'Priority', render: (r: any) => <Badge label={r.priority} /> },
    { key: 'created_at', title: 'Created', render: (r: any) => r.created_at?.substring(0, 10) },
  ];

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const sel = inp;

  const byStatus = stats.by_status || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lead Management</h1>
          <p className="text-slate-500 text-sm">Capture and manage sales leads</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={stats.total || 0} icon="🎯" color="indigo" />
        {['new','contacted','qualified','converted'].map(s => (
          <StatCard key={s} title={s.charAt(0).toUpperCase()+s.slice(1)} value={byStatus[s] || 0} icon={s==='converted'?'✅':s==='qualified'?'⭐':s==='contacted'?'📞':'🆕'} color={s==='converted'?'green':s==='qualified'?'purple':s==='contacted'?'blue':'orange'} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">All Status</option>
          {['new','contacted','qualified','unqualified','converted','lost'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        title="All Leads"
        columns={columns}
        data={leads}
        loading={loading}
        onAdd={() => { resetForm(); setEditItem(null); setShowModal(true); }}
        addLabel="Add Lead"
        onExport={() => downloadExcel('/leads/export', 'leads.xlsx')}
        onSearch={setSearch}
        searchPlaceholder="Search leads..."
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
            {row.status !== 'converted' && (
              <button onClick={() => handleConvert(row.id)} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Convert</button>
            )}
            <button onClick={() => handleDelete(row.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
          </>
        )}
      />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Edit Lead' : 'Add New Lead'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">First Name *</label>
            <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Last Name</label>
            <input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Company</label>
            <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Designation</label>
            <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Industry</label>
            <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className={sel}>
              <option value="">Select Industry</option>
              {['IT','Manufacturing','Retail','Healthcare','Finance','Education','Logistics','Real Estate','Other'].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Source</label>
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className={sel}>
              <option value="">Select Source</option>
              {['Website','Cold Call','Email','Referral','Social Media','Exhibition','Partner','Other'].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Status</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={sel}>
              {['new','contacted','qualified','unqualified','converted','lost'].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={sel}>
              {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">State</label>
            <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={inp} /></div>
          <div className="col-span-2"><label className="text-xs font-medium text-slate-700 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} rows={3} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2 gradient-bg text-white rounded-lg text-sm font-medium">
              {editItem ? 'Update' : 'Create'} Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeadsPage;
