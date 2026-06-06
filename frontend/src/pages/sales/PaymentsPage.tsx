import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Payment { id: number; payment_number: string; invoice_id: number; amount: number; payment_mode: string; reference_number: string; status: string; }
interface Invoice { id: number; invoice_number: string; customer_id: number; balance_due: number; }
interface Customer { id: number; company_name: string; name?: string; }

const modeColor: Record<string, string> = { bank_transfer: 'blue', upi: 'green', cheque: 'yellow', neft: 'indigo', rtgs: 'purple', cash: 'gray' };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ invoice_id: '', customer_id: '', amount: '', payment_mode: 'bank_transfer', reference_number: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, invRes, custRes] = await Promise.all([
        api.get('/sales/payments', { params: { limit: 100 } }),
        api.get('/sales/invoices', { params: { limit: 200 } }),
        api.get('/crm/customers', { params: { limit: 100 } }),
      ]);
      setPayments(pRes.data.items || pRes.data);
      setInvoices(invRes.data.items || invRes.data);
      setCustomers(custRes.data.items || custRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onInvoiceChange = (invId: string) => {
    const inv = invoices.find(i => i.id === Number(invId));
    setForm(f => ({ ...f, invoice_id: invId, customer_id: String(inv?.customer_id || ''), amount: String(inv?.balance_due || '') }));
  };

  const submit = async () => {
    if (!form.invoice_id || !form.amount) return toast.error('Fill required fields');
    try {
      await api.post('/sales/payments', {
        invoice_id: Number(form.invoice_id), customer_id: Number(form.customer_id),
        amount: Number(form.amount), payment_mode: form.payment_mode,
        reference_number: form.reference_number, notes: form.notes,
      });
      toast.success('Payment recorded!'); setModalOpen(false); load();
      setForm({ invoice_id: '', customer_id: '', amount: '', payment_mode: 'bank_transfer', reference_number: '', notes: '' });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const custName = (custId: number) => { const c = customers.find(c => c.id === custId); return c ? (c.company_name || c.name || `CUS-${custId}`) : `CUS-${custId}`; };
  const invNum = (invId: number) => invoices.find(i => i.id === invId)?.invoice_number || `INV-${invId}`;

  const filtered = payments.filter(p => !filter ||
    p.payment_number?.toLowerCase().includes(filter.toLowerCase()) ||
    invNum(p.invoice_id).toLowerCase().includes(filter.toLowerCase())
  );

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const columns = [
    { key: 'payment_number', title: 'Payment #', render: (r: Payment) => <span className="font-mono font-medium text-indigo-600">{r.payment_number}</span> },
    { key: 'invoice_id', title: 'Invoice', render: (r: Payment) => invNum(r.invoice_id) },
    { key: 'amount', title: 'Amount', render: (r: Payment) => <span className="font-semibold text-green-600">₹{(r.amount || 0).toLocaleString('en-IN')}</span> },
    { key: 'payment_mode', title: 'Mode', render: (r: Payment) => <Badge label={r.payment_mode?.replace('_', ' ')} color={modeColor[r.payment_mode] as any || 'gray'} /> },
    { key: 'reference_number', title: 'Reference', render: (r: Payment) => <span className="font-mono text-xs">{r.reference_number || '-'}</span> },
    { key: 'status', title: 'Status', render: (r: Payment) => <Badge label={r.status || 'completed'} color="green" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Payments</h1><p className="text-slate-500 text-sm mt-1">Track all payment receipts</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Record Payment</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Payments', value: payments.length, color: 'text-indigo-600' },
          { label: 'Total Received', value: `₹${totalReceived.toLocaleString('en-IN')}`, color: 'text-green-600' },
          { label: 'This Month', value: payments.filter(p => { const d = new Date(p.payment_date || p.created_at || ''); const now = new Date(); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Payment History"
        onSearch={setFilter} searchPlaceholder="Search payments..." onAdd={() => setModalOpen(true)} addLabel="Record Payment" />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice *</label>
            <select value={form.invoice_id} onChange={e => onInvoiceChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select Invoice</option>
              {invoices.filter(i => (i.balance_due || 0) > 0).map(i => (
                <option key={i.id} value={i.id}>{i.invoice_number} — ₹{(i.balance_due || 0).toLocaleString('en-IN')} due</option>
              ))}
            </select>
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
                {['bank_transfer','upi','neft','rtgs','cheque','cash'].map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Reference</label>
            <input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="UTR/TXN ID"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Record Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
