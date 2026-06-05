import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api, { downloadExcel } from '../../api/client';
import toast from 'react-hot-toast';

interface Expense { id: number; expense_number: string; expense_date: string; category: string; description: string; amount: number; status: string; payment_mode: string; vendor_name: string; }

const statusColor: Record<string, string> = { pending: 'yellow', approved: 'green', rejected: 'red', paid: 'blue' };
const CATEGORIES = ["Travel","Office Supplies","Marketing","Software","Meals","Training","Repairs","Utilities","Rent","Professional Fees","Insurance"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], category: '', description: '', amount: '', payment_mode: 'bank_transfer', vendor_name: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/finance/expenses', { params: { limit: 100 } });
      setExpenses(r.data.items || r.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.category || !form.amount) return toast.error('Fill required fields');
    try {
      await api.post('/finance/expenses', { ...form, amount: Number(form.amount) });
      toast.success('Expense added!'); setModalOpen(false); load();
      setForm({ expense_date: new Date().toISOString().split('T')[0], category: '', description: '', amount: '', payment_mode: 'bank_transfer', vendor_name: '', notes: '' });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const approveExpense = async (id: number) => {
    await api.put(`/finance/expenses/${id}`, { status: 'approved' });
    toast.success('Approved'); load();
  };

  const filtered = expenses.filter(e => !filter ||
    e.expense_number?.toLowerCase().includes(filter.toLowerCase()) ||
    e.category?.toLowerCase().includes(filter.toLowerCase()) ||
    e.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const pending = expenses.filter(e => e.status === 'pending').length;

  const columns = [
    { key: 'expense_number', title: 'Expense #', render: (r: Expense) => <span className="font-mono font-medium text-indigo-600">{r.expense_number}</span> },
    { key: 'expense_date', title: 'Date', render: (r: Expense) => r.expense_date ? new Date(r.expense_date).toLocaleDateString('en-IN') : '-' },
    { key: 'category', title: 'Category', render: (r: Expense) => <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-xs font-medium">{r.category}</span> },
    { key: 'description', title: 'Description', render: (r: Expense) => <span className="text-slate-600 max-w-xs truncate block">{r.description || '-'}</span> },
    { key: 'vendor_name', title: 'Vendor', render: (r: Expense) => r.vendor_name || '-' },
    { key: 'amount', title: 'Amount', render: (r: Expense) => <span className="font-semibold">₹{(r.amount || 0).toLocaleString('en-IN')}</span> },
    { key: 'payment_mode', title: 'Mode', render: (r: Expense) => r.payment_mode?.replace('_', ' ') || '-' },
    { key: 'status', title: 'Status', render: (r: Expense) => <Badge label={r.status || 'pending'} color={statusColor[r.status] as any || 'gray'} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Expenses</h1><p className="text-slate-500 text-sm mt-1">Track and manage all business expenses</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Expense</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Expenses', value: expenses.length, color: 'text-indigo-600' },
          { label: 'Pending Approval', value: pending, color: 'text-yellow-600' },
          { label: 'Total Amount', value: `₹${expenses.reduce((s,e) => s+(e.amount||0), 0).toLocaleString('en-IN')}`, color: 'text-slate-800' },
          { label: 'Approved', value: expenses.filter(e => e.status === 'approved').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Expense List"
        onSearch={setFilter} searchPlaceholder="Search expenses..."
        onExport={() => downloadExcel('/finance/expenses/export', 'expenses.xlsx')}
        onAdd={() => setModalOpen(true)} addLabel="Add Expense"
        actions={(row: Expense) => (
          row.status === 'pending'
            ? <button onClick={() => approveExpense(row.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">Approve</button>
            : null
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['bank_transfer','credit_card','cash','upi','cheque'].map(m => <option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor / Payee</label>
            <input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
              placeholder="Vendor name"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Expense</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
