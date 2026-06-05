import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';

const TicketsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const defaultForm = { subject: '', description: '', ticket_type: 'incident', category: '', priority: 'medium', contact_name: '', contact_email: '', contact_phone: '' };
  const [form, setForm] = useState<any>(defaultForm);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/helpdesk/tickets', { params });
      setItems(res?.data?.items || []);
    } catch {} finally { setLoading(false); }
  }, [statusFilter]);

  const fetchStats = async () => {
    try { const res = await api.get('/helpdesk/tickets/stats'); setStats(res.data); } catch {}
  };

  useEffect(() => { fetch(); fetchStats(); }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/helpdesk/tickets/${editItem.id}`, form);
      else await api.post('/helpdesk/tickets', form);
      setShowModal(false); setEditItem(null); setForm(defaultForm); fetch(); fetchStats();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({ subject: item.subject, description: item.description || '', ticket_type: item.ticket_type,
      category: item.category || '', priority: item.priority, contact_name: item.contact_name || '',
      contact_email: item.contact_email || '', contact_phone: item.contact_phone || '' });
    setShowModal(true);
  };

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const columns = [
    { key: 'ticket_number', title: 'Ticket #', render: (r: any) => <span className="font-mono text-indigo-600 text-xs">{r.ticket_number}</span> },
    { key: 'subject', title: 'Subject', render: (r: any) => <div><div className="font-medium text-slate-800 max-w-xs truncate">{r.subject}</div><div className="text-xs text-slate-500">{r.contact_name}</div></div> },
    { key: 'ticket_type', title: 'Type', render: (r: any) => <Badge label={r.ticket_type} /> },
    { key: 'priority', title: 'Priority', render: (r: any) => <Badge label={r.priority} /> },
    { key: 'status', title: 'Status', render: (r: any) => <Badge label={r.status} /> },
    { key: 'sla_breached', title: 'SLA', render: (r: any) => r.sla_breached ? <Badge label="breached" color="bg-red-100 text-red-700" /> : <Badge label="ok" color="bg-green-100 text-green-700" /> },
    { key: 'created_at', title: 'Created', render: (r: any) => r.created_at?.substring(0, 10) },
  ];

  const byStatus = stats.by_status || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1><p className="text-slate-500 text-sm">Manage customer support requests</p></div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={stats.total || 0} icon="🎫" color="indigo" />
        <StatCard title="Open" value={byStatus.open || 0} icon="🔓" color="blue" />
        <StatCard title="In Progress" value={byStatus.in_progress || 0} icon="⚙️" color="orange" />
        <StatCard title="SLA Breached" value={stats.sla_breached || 0} icon="⚠️" color="red" />
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">All Status</option>
          {['open','in_progress','pending','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable title="All Tickets" columns={columns} data={items} loading={loading}
        onAdd={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
        addLabel="Raise Ticket" onExport={() => downloadExcel('/helpdesk/tickets/export', 'tickets.xlsx')}
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
            {row.status === 'open' && (
              <button onClick={async () => { await api.put(`/helpdesk/tickets/${row.id}`, { status: 'in_progress' }); fetch(); }}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Assign</button>
            )}
            {['open','in_progress'].includes(row.status) && (
              <button onClick={async () => { await api.put(`/helpdesk/tickets/${row.id}`, { status: 'resolved' }); fetch(); fetchStats(); }}
                className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Resolve</button>
            )}
          </>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Ticket' : 'Raise Ticket'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-medium text-slate-700 mb-1 block">Subject *</label>
            <input required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Type</label>
            <select value={form.ticket_type} onChange={e => setForm({...form, ticket_type: e.target.value})} className={inp}>
              {['incident','request','problem','change'].map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inp}>
              {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Category</label>
            <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Contact Name</label>
            <input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Contact Email</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Contact Phone</label>
            <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={inp} /></div>
          <div className="col-span-2"><label className="text-xs font-medium text-slate-700 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} rows={4} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2 gradient-bg text-white rounded-lg text-sm font-medium">{editItem ? 'Update' : 'Create'} Ticket</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TicketsPage;
