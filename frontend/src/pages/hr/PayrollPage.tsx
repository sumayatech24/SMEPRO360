import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Payroll { id: number; employee_id: number; month?: number; year?: number; payroll_period?: string; basic_salary: number; hra: number; other_allowances: number; gross_salary: number; pf_deduction?: number; pf_employee?: number; esi_deduction?: number; esic_employee?: number; tds_deduction?: number; total_deductions?: number; net_salary: number; status: string; }
interface Employee { id: number; first_name: string; last_name: string; employee_number: string; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const statusColor: Record<string, string> = { pending: 'yellow', processed: 'blue', paid: 'green', cancelled: 'red' };

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [form, setForm] = useState({
    employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basic_salary: '', hra: '', other_allowances: '',
    pf_deduction: '', esi_deduction: '', tds_deduction: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        api.get('/hr/payroll', { params: { limit: 200 } }),
        api.get('/hr/employees', { params: { limit: 100 } }),
      ]);
      setPayrolls(pRes.data.items || pRes.data);
      setEmployees(eRes.data.items || eRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const empName = (id: number) => {
    const e = employees.find(e => e.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `EMP-${id}`;
  };

  const calcNet = () => {
    const gross = Number(form.basic_salary) + Number(form.hra) + Number(form.other_allowances);
    const deductions = Number(form.pf_deduction) + Number(form.esi_deduction) + Number(form.tds_deduction);
    return gross - deductions;
  };

  const submit = async () => {
    if (!form.employee_id || !form.basic_salary) return toast.error('Fill required fields');
    try {
      await api.post('/hr/payroll', {
        employee_id: Number(form.employee_id),
        month: form.month, year: form.year,
        basic_salary: Number(form.basic_salary), hra: Number(form.hra),
        other_allowances: Number(form.other_allowances),
        pf_deduction: Number(form.pf_deduction), esi_deduction: Number(form.esi_deduction),
        tds_deduction: Number(form.tds_deduction),
        status: 'pending',
      });
      toast.success('Payroll record created!'); setModalOpen(false); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const markPaid = async (id: number) => {
    await api.put(`/hr/payroll/${id}`, { status: 'paid' });
    toast.success('Marked as Paid'); load();
  };

  const onEmpChange = (empId: string) => {
    const emp = employees.find(e => e.id === Number(empId));
    if (emp) {
      setForm(f => ({
        ...f, employee_id: empId,
        basic_salary: String((emp as any).basic_salary || ''),
        hra: String(Math.round((emp as any).basic_salary * 0.4) || ''),
        pf_deduction: String(Math.round((emp as any).basic_salary * 0.12) || ''),
        esi_deduction: String((emp as any).basic_salary <= 21000 ? Math.round((emp as any).basic_salary * 0.0075) : 0),
      }));
    }
  };

  // Parse month/year from payroll_period ("2026-05") if month/year fields are missing
  const getMonth = (p: Payroll) => p.month || Number((p.payroll_period||'').split('-')[1]) || 0;
  const getYear = (p: Payroll) => p.year || Number((p.payroll_period||'').split('-')[0]) || 0;

  const filtered = payrolls.filter(p =>
    (!filterMonth || getMonth(p) === Number(filterMonth)) &&
    (!filterYear || getYear(p) === Number(filterYear))
  );

  const totalNetPay = filtered.reduce((s, p) => s + (p.net_salary || 0), 0);

  const columns = [
    { key: 'employee_id', title: 'Employee', render: (r: Payroll) => <span className="font-medium">{empName(r.employee_id)}</span> },
    { key: 'payroll_period', title: 'Month/Year', render: (r: Payroll) => { const m=getMonth(r); const y=getYear(r); return m&&y?`${MONTHS[m-1]} ${y}`:(r.payroll_period||'-'); } },
    { key: 'basic_salary', title: 'Basic', render: (r: Payroll) => `₹${(r.basic_salary || 0).toLocaleString('en-IN')}` },
    { key: 'gross_salary', title: 'Gross', render: (r: Payroll) => `₹${(r.gross_salary || 0).toLocaleString('en-IN')}` },
    { key: 'total_deductions', title: 'Deductions', render: (r: Payroll) => { const d = r.total_deductions || (r.pf_deduction||r.pf_employee||0)+(r.esi_deduction||r.esic_employee||0)+(r.tds_deduction||0); return <span className="text-red-500">-₹{d.toLocaleString('en-IN')}</span>; } },
    { key: 'net_salary', title: 'Net Pay', render: (r: Payroll) => <span className="font-bold text-green-600">₹{(r.net_salary || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', title: 'Status', render: (r: Payroll) => <Badge label={r.status} color={statusColor[r.status] as any} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Payroll</h1><p className="text-slate-500 text-sm mt-1">Manage employee payroll and salary disbursements</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Payroll</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: payrolls.length },
          { label: 'Pending', value: payrolls.filter(p => p.status === 'pending').length },
          { label: 'Total Net Pay', value: `₹${totalNetPay.toLocaleString('en-IN')}` },
          { label: 'Paid This Month', value: filtered.filter(p => p.status === 'paid').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title={`Payroll — ${filterMonth ? MONTHS[Number(filterMonth)-1] : 'All'} ${filterYear}`}
        onAdd={() => setModalOpen(true)} addLabel="Add Payroll"
        actions={(row: Payroll) => (
          row.status === 'pending'
            ? <button onClick={() => markPaid(row.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">Mark Paid</button>
            : null
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Payroll Record" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
              <select value={form.employee_id} onChange={e => onEmpChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-800 uppercase">Earnings</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Basic Salary','basic_salary'],['HRA','hra'],['Other Allowances','other_allowances']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input type="number" value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-red-800 uppercase">Deductions</p>
            <div className="grid grid-cols-3 gap-3">
              {[['PF','pf_deduction'],['ESI','esi_deduction'],['TDS','tds_deduction']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input type="number" value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Net Pay</span>
            <span className="text-2xl font-bold text-green-600">₹{calcNet().toLocaleString('en-IN')}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Payroll</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
