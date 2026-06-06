import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);

  const defaultForm = {
    first_name: '', last_name: '', email: '', phone: '', department_id: '',
    employment_type: 'full_time', date_of_joining: '', basic_salary: 0,
    hra: 0, other_allowances: 0, pan_number: '', city: '', state: '',
    bank_name: '', bank_account: '', bank_ifsc: ''
  };
  const [form, setForm] = useState<any>(defaultForm);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/employees', { params: { search, limit: 100 } });
      setItems(res?.data?.items || []);
    } catch {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    fetch();
    api.get('/hr/departments').then(r => setDepartments(r.data)).catch(() => {});
  }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/hr/employees/${editItem.id}`, form);
      else await api.post('/hr/employees', form);
      setShowModal(false); setEditItem(null); setForm(defaultForm); fetch();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({ first_name: item.first_name, last_name: item.last_name || '', email: item.email || '',
      phone: item.phone || '', department_id: item.department_id || '', employment_type: item.employment_type,
      date_of_joining: item.date_of_joining || '', basic_salary: item.basic_salary,
      hra: item.hra || 0, other_allowances: item.other_allowances || 0, pan_number: item.pan_number || '',
      city: item.city || '', state: item.state || '', bank_name: item.bank_name || '',
      bank_account: item.bank_account || '', bank_ifsc: item.bank_ifsc || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this employee?')) { await api.delete(`/hr/employees/${id}`); fetch(); }
  };

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const columns = [
    { key: 'employee_number', title: 'Emp #', render: (r: any) => <span className="font-mono text-indigo-600 text-xs">{r.employee_number}</span> },
    { key: 'name', title: 'Employee', render: (r: any) => (
      <button onClick={() => navigate(`/hr/employees/${r.id}`)} className="text-left hover:text-indigo-600 transition-colors">
        <div className="font-semibold">{r.first_name} {r.last_name}</div>
        <div className="text-xs text-slate-500">{r.email}</div>
      </button>
    )},
    { key: 'department_id', title: 'Dept', render: (r: any) => departments.find((d: any) => d.id === r.department_id)?.name || (r.department_id ? `Dept ${r.department_id}` : '—') },
    { key: 'employment_type', title: 'Type', render: (r: any) => <Badge label={r.employment_type?.replace('_',' ')} color="blue" /> },
    { key: 'basic_salary', title: 'Basic Salary', render: (r: any) => `₹${(r.basic_salary||0).toLocaleString('en-IN')}` },
    { key: 'status', title: 'Status', render: (r: any) => <Badge label={r.status||'active'} color={r.status==='active'?'green':'gray'} /> },
    { key: 'date_of_joining', title: 'Joined', render: (r: any) => r.date_of_joining ? new Date(r.date_of_joining).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—' },
    { key: 'open', title: '', render: (r: any) => (
      <button onClick={() => navigate(`/hr/employees/${r.id}`)} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">View Profile →</button>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">Employees</h1><p className="text-slate-500 text-sm">Manage your workforce</p></div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Employees" value={items.length} icon="👥" color="indigo" />
        <StatCard title="Full Time" value={items.filter(e => e.employment_type === 'full_time').length} icon="👤" color="green" />
        <StatCard title="Contract" value={items.filter(e => e.employment_type === 'contract').length} icon="📋" color="orange" />
      </div>

      <DataTable title="All Employees" columns={columns} data={items} loading={loading}
        onAdd={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
        addLabel="Add Employee" onExport={() => downloadExcel('/hr/employees/export', 'employees.xlsx')}
        onSearch={setSearch} searchPlaceholder="Search employees..."
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
            <button onClick={() => handleDelete(row.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
          </>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Employee' : 'Add Employee'} size="xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">First Name *</label>
            <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Last Name</label>
            <input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Department</label>
            <select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} className={inp}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Employment Type</label>
            <select value={form.employment_type} onChange={e => setForm({...form, employment_type: e.target.value})} className={inp}>
              <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option>
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Date of Joining</label>
            <input type="date" value={form.date_of_joining} onChange={e => setForm({...form, date_of_joining: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">PAN Number</label>
            <input value={form.pan_number} onChange={e => setForm({...form, pan_number: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Basic Salary (₹)</label>
            <input type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">HRA (₹)</label>
            <input type="number" value={form.hra} onChange={e => setForm({...form, hra: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Other Allowances (₹)</label>
            <input type="number" value={form.other_allowances} onChange={e => setForm({...form, other_allowances: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Bank Name</label>
            <input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Bank Account</label>
            <input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} className={inp} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2 gradient-bg text-white rounded-lg text-sm font-medium">{editItem ? 'Update' : 'Add'} Employee</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
