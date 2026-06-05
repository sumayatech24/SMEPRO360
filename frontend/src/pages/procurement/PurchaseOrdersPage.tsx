import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api, { downloadExcel } from '../../api/client';
import toast from 'react-hot-toast';

interface PO { id: number; order_number: string; vendor_id: number; status: string; order_date: string; expected_date: string; total_amount: number; payment_status: string; }
interface Vendor { id: number; company_name: string; name?: string; }

const statusColor: Record<string, string> = { draft: 'gray', approved: 'blue', ordered: 'indigo', received: 'green', cancelled: 'red', partial: 'yellow' };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ vendor_id: '', expected_date: '', payment_terms: '30', notes: '', items: [{ description: '', quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 18 }] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, vRes] = await Promise.all([
        api.get('/procurement/orders', { params: { limit: 100 } }),
        api.get('/procurement/vendors', { params: { limit: 100 } }),
      ]);
      setOrders(oRes.data.items || oRes.data);
      setVendors(vRes.data.items || vRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 18 }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, x) => x !== i) }));
  const updateItem = (i: number, field: string, val: any) => setForm(f => ({ ...f, items: f.items.map((item, x) => x === i ? { ...item, [field]: val } : item) }));

  const submit = async () => {
    if (!form.vendor_id) return toast.error('Select a vendor');
    try {
      await api.post('/procurement/orders', {
        vendor_id: Number(form.vendor_id),
        expected_date: form.expected_date || undefined,
        payment_terms: Number(form.payment_terms),
        notes: form.notes,
        items: form.items.map(i => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_percent: Number(i.tax_percent) })),
      });
      toast.success('Purchase order created!'); setModalOpen(false); load();
      setForm({ vendor_id: '', expected_date: '', payment_terms: '30', notes: '', items: [{ description: '', quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 18 }] });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const approve = async (id: number) => {
    await api.put(`/procurement/orders/${id}`, { status: 'approved' });
    toast.success('PO Approved'); load();
  };

  const vendorName = (id: number) => { const v = vendors.find(v => v.id === id); return v ? (v.company_name || v.name || `VND-${id}`) : `VND-${id}`; };
  const filtered = orders.filter(o => !filter || o.order_number?.toLowerCase().includes(filter.toLowerCase()) || vendorName(o.vendor_id).toLowerCase().includes(filter.toLowerCase()));

  const columns = [
    { key: 'order_number', title: 'PO #', render: (r: PO) => <span className="font-mono font-medium text-indigo-600">{r.order_number}</span> },
    { key: 'vendor_id', title: 'Vendor', render: (r: PO) => vendorName(r.vendor_id) },
    { key: 'order_date', title: 'Order Date', render: (r: PO) => r.order_date ? new Date(r.order_date).toLocaleDateString('en-IN') : '-' },
    { key: 'expected_date', title: 'Expected', render: (r: PO) => r.expected_date ? new Date(r.expected_date).toLocaleDateString('en-IN') : '-' },
    { key: 'total_amount', title: 'Total', render: (r: PO) => `₹${(r.total_amount || 0).toLocaleString('en-IN')}` },
    { key: 'status', title: 'Status', render: (r: PO) => <Badge label={r.status} color={statusColor[r.status] as any} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1><p className="text-slate-500 text-sm mt-1">{orders.length} orders</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New PO</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total POs', value: orders.length },
          { label: 'Pending Approval', value: orders.filter(o => o.status === 'draft').length },
          { label: 'Approved', value: orders.filter(o => o.status === 'approved').length },
          { label: 'Total Value', value: `₹${orders.reduce((s, o) => s + (o.total_amount || 0), 0).toLocaleString('en-IN')}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Purchase Orders"
        onSearch={setFilter} searchPlaceholder="Search POs..." onAdd={() => setModalOpen(true)} addLabel="New PO"
        onExport={() => downloadExcel('/procurement/orders/export', 'purchase_orders.xlsx')}
        actions={(row: PO) => (
          <div className="flex gap-2">
            {row.status === 'draft' && <button onClick={() => approve(row.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">Approve</button>}
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Purchase Order" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
              <select value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Date</label>
              <input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Items</label>
              <button onClick={addItem} className="text-xs text-indigo-600 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input className="col-span-5 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Qty"
                    value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Unit Price"
                    value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="GST%"
                    value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', e.target.value)} />
                  <button onClick={() => removeItem(idx)} className="col-span-1 text-red-400 hover:text-red-600 text-xl">×</button>
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
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create PO</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
