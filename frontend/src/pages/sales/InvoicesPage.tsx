import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api, { downloadExcel } from '../../api/client';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  status: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
}
interface Customer { id: number; company_name: string; name?: string; }

const statusColor: Record<string, string> = {
  draft: 'gray', sent: 'blue', paid: 'green', partial: 'yellow', overdue: 'red', cancelled: 'red'
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewInv, setViewInv] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    customer_id: '', due_date: '', notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, tax_percent: 18 }]
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, custRes] = await Promise.all([
        api.get('/sales/invoices', { params: { limit: 100 } }),
        api.get('/crm/customers', { params: { limit: 100 } }),
      ]);
      setInvoices(invRes.data.items || invRes.data);
      setCustomers(custRes.data.items || custRes.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.customer_id) return toast.error('Select a customer');
    try {
      await api.post('/sales/invoices', {
        customer_id: Number(form.customer_id),
        due_date: form.due_date || undefined,
        notes: form.notes,
        items: form.items.map(i => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_percent: Number(i.tax_percent) })),
      });
      toast.success('Invoice created!');
      setModalOpen(false); load();
      setForm({ customer_id: '', due_date: '', notes: '', items: [{ description: '', quantity: 1, unit_price: 0, tax_percent: 18 }] });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const markSent = async (id: number) => {
    await api.put(`/sales/invoices/${id}`, { status: 'sent' });
    toast.success('Marked as Sent'); load();
  };

  const customerName = (id: number) => { const c = customers.find(c => c.id === id); return c ? (c.company_name || c.name || `CUS-${id}`) : `CUS-${id}`; };

  const filtered = invoices.filter(i =>
    !filter || i.invoice_number?.toLowerCase().includes(filter.toLowerCase()) ||
    customerName(i.customer_id).toLowerCase().includes(filter.toLowerCase())
  );

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, tax_percent: 18 }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, val: any) =>
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));

  const totalUnpaid = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);

  const columns = [
    { key: 'invoice_number', title: 'Invoice #', render: (r: Invoice) => <span className="font-mono font-medium text-indigo-600">{r.invoice_number}</span> },
    { key: 'customer_id', title: 'Customer', render: (r: Invoice) => customerName(r.customer_id) },
    { key: 'invoice_date', title: 'Date', render: (r: Invoice) => r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN') : '-' },
    { key: 'due_date', title: 'Due Date', render: (r: Invoice) => r.due_date ? new Date(r.due_date).toLocaleDateString('en-IN') : '-' },
    { key: 'total_amount', title: 'Total', render: (r: Invoice) => `₹${(r.total_amount || 0).toLocaleString('en-IN')}` },
    { key: 'amount_paid', title: 'Paid', render: (r: Invoice) => <span className="text-green-600">₹{(r.amount_paid || 0).toLocaleString('en-IN')}</span> },
    { key: 'balance_due', title: 'Balance', render: (r: Invoice) => <span className={(r.balance_due || 0) > 0 ? 'text-red-500 font-medium' : 'text-green-600'}>₹{(r.balance_due || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', title: 'Status', render: (r: Invoice) => <Badge label={r.status} color={statusColor[r.status] as any} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Manage customer invoices and payments</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Invoice</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-indigo-600' },
          { label: 'Revenue Collected', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-green-600' },
          { label: 'Outstanding', value: `₹${totalUnpaid.toLocaleString('en-IN')}`, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns} data={filtered} loading={loading}
        title="Invoice List"
        onSearch={setFilter}
        searchPlaceholder="Search invoices..."
        onExport={() => downloadExcel('/sales/invoices/export', 'invoices.xlsx')}
        onAdd={() => setModalOpen(true)}
        addLabel="New Invoice"
        actions={(row: Invoice) => (
          <div className="flex gap-2">
            <button onClick={() => setViewInv(row)} className="text-xs px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">View</button>
            <button onClick={() => navigate(`/print/invoice/${row.id}`)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">🖨️ Print</button>
            {row.status === 'draft' && <button onClick={() => markSent(row.id)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Send</button>}
          </div>
        )}
      />

      {/* Create Invoice Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Invoice" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
              <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Line Items</label>
              <button onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input className="col-span-5 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Unit Price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="GST%" value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', e.target.value)} />
                  <button onClick={() => removeItem(idx)} className="col-span-1 text-red-400 hover:text-red-600 text-xl leading-none">×</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Invoice</button>
          </div>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      {viewInv && (
        <Modal isOpen={!!viewInv} onClose={() => setViewInv(null)} title={`Invoice ${viewInv.invoice_number}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{customerName(viewInv.customer_id)}</span></div>
              <div><span className="text-slate-500">Status:</span> <Badge label={viewInv.status} color={statusColor[viewInv.status] as any} /></div>
              <div><span className="text-slate-500">Invoice Date:</span> <span>{viewInv.invoice_date ? new Date(viewInv.invoice_date).toLocaleDateString('en-IN') : '-'}</span></div>
              <div><span className="text-slate-500">Due Date:</span> <span>{viewInv.due_date ? new Date(viewInv.due_date).toLocaleDateString('en-IN') : '-'}</span></div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total Amount</span><span className="font-semibold">₹{(viewInv.total_amount || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Amount Paid</span><span className="text-green-600 font-medium">₹{(viewInv.amount_paid || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold text-slate-700">Balance Due</span><span className="font-bold text-red-500">₹{(viewInv.balance_due || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
