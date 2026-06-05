import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

interface Leave {
  id: number;
  employee_id: number;
  employee_name?: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  start_date?: string;
  end_date?: string;
  days: number;
  reason: string;
  status: string;
}

interface Employee { id: number; first_name: string; last_name?: string; employee_number?: string; name?: string; employee_code?: string; }
const LEAVE_TYPES = ['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'other'];
const today = new Date().toISOString().split('T')[0];

const LeavesPage: React.FC = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: '', leave_type: 'casual', from_date: today, to_date: today, reason: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/leaves', { params: { limit: 20, skip: (page - 1) * 20 } });
      const data = res.data;
      if (Array.isArray(data)) { setLeaves(data); setTotal(data.length); }
      else { setLeaves(data.items || []); setTotal(data.total || 0); }
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    api.get('/hr/employees', { params: { limit: 500 } })
      .then(r => setEmployees(Array.isArray(r.data) ? r.data : (r.data.items || [])))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/hr/leaves', { ...form, employee_id: Number(form.employee_id) });
      setShowModal(false);
      fetch();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Save failed'); }
    setSaving(false);
  };

  const handleApprove = async (id: number) => { await api.put(`/hr/leaves/${id}/approve`, {}); fetch(); };
  const handleReject = async (id: number) => { await api.put(`/hr/leaves/${id}/reject`, {}); fetch(); };

  const columns = [
    { key: 'employee_name', title: 'Employee', render: (row: Leave) => <span className="font-medium">{row.employee_name || '—'}</span> },
    { key: 'leave_type', title: 'Type', render: (row: Leave) => <span className="capitalize text-sm">{row.leave_type}</span> },
    { key: 'from_date', title: 'From', render: (row: Leave) => { const d = row.from_date || row.start_date; return d ? new Date(d).toLocaleDateString('en-IN') : '-'; } },
    { key: 'to_date', title: 'To', render: (row: Leave) => { const d = row.to_date || row.end_date; return d ? new Date(d).toLocaleDateString('en-IN') : '-'; } },
    { key: 'days', title: 'Days', render: (row: Leave) => <span className="font-semibold">{row.days}</span> },
    { key: 'reason', title: 'Reason', render: (row: Leave) => <span className="text-sm text-slate-500 truncate max-w-xs block">{row.reason}</span> },
    { key: 'status', title: 'Status', render: (row: Leave) => <Badge label={row.status} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="text-slate-500 text-sm">Manage employee leave applications</p>
        </div>
        <button onClick={() => downloadExcel('/hr/leaves/export', 'leaves.xlsx')}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300">
          📥 Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: total, icon: '🌴', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Pending', value: leaves.filter(l => l.status === 'pending').length, icon: '⏳', color: 'text-orange-600 bg-orange-50' },
          { label: 'Approved', value: leaves.filter(l => l.status === 'approved').length, icon: '✅', color: 'text-green-600 bg-green-50' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, icon: '❌', color: 'text-red-600 bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${stat.color}`}>{stat.icon}</div>
            <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <DataTable
        title="Leave Applications"
        columns={columns}
        data={leaves}
        loading={loading}
        onAdd={() => { setForm({ employee_id: '', leave_type: 'casual', start_date: today, end_date: today, reason: '' }); setShowModal(true); }}
        addLabel="+ Apply Leave"
        actions={(row) => row.status === 'pending' ? (
          <div className="flex gap-2">
            <button onClick={() => handleApprove(row.id)} className="text-xs text-green-600 hover:underline font-semibold">Approve</button>
            <button onClick={() => handleReject(row.id)} className="text-xs text-red-500 hover:underline">Reject</button>
          </div>
        ) : null}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for Leave" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600">Employee *</label>
            <select value={form.employee_id} onChange={e => setForm((f: any) => ({ ...f, employee_id: e.target.value }))}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''} ({e.employee_number || ''})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm((f: any) => ({ ...f, leave_type: e.target.value }))}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">From Date</label>
              <input type="date" value={form.from_date} onChange={e => setForm((f: any) => ({ ...f, from_date: e.target.value }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">To Date</label>
              <input type="date" value={form.to_date} onChange={e => setForm((f: any) => ({ ...f, to_date: e.target.value }))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Reason</label>
            <textarea value={form.reason} onChange={e => setForm((f: any) => ({ ...f, reason: e.target.value }))} rows={3}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-400" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 gradient-bg text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeavesPage;
