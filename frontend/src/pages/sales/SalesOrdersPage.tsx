import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

interface SalesOrder { id: number; order_number: string; customer_id: number; order_date: string; status: string; total_amount: number; payment_status: string; notes?: string; }
interface Customer { id: number; company_name: string; name?: string; }
interface Product { id: number; sku: string; name: string; selling_price: number; tax_percent: number; unit: string; hsn_code?: string; }
interface TaxSlab { id: number; name: string; rate: number; cgst_rate: number; sgst_rate: number; }
interface Template { id: number; name: string; category: string; description: string; items: TemplateItem[]; payment_terms: string; notes: string; }
interface TemplateItem { description: string; item_type: string; quantity: number; unit: string; unit_price: number; discount_percent: number; tax_percent: number; hsn_code?: string; product_id?: number; }

interface LineItem { id: string; product_id?: number; description: string; item_type: string; quantity: number; unit: string; unit_price: number; discount_percent: number; tax_slab_id?: number; tax_percent: number; hsn_code: string; }

const STATUSES = ['draft','confirmed','processing','shipped','delivered','cancelled'];
const statusColor: Record<string,string> = { draft:'gray', confirmed:'blue', processing:'indigo', shipped:'yellow', delivered:'green', cancelled:'red' };

function calcLine(item: LineItem) {
  const subtotal = item.quantity * item.unit_price * (1 - item.discount_percent/100);
  const tax = subtotal * item.tax_percent / 100;
  return { subtotal, tax, total: subtotal + tax };
}

const emptyLine = (): LineItem => ({ id: Math.random().toString(36).slice(2), description:'', item_type:'product', quantity:1, unit:'nos', unit_price:0, discount_percent:0, tax_percent:18, hsn_code:'' });

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);

  const [form, setForm] = useState({ customer_id:'', order_date:new Date().toISOString().split('T')[0], delivery_date:'', payment_terms:'30 days', notes:'', is_interstate:false });
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const [oRes, cRes, pRes, sRes, tRes] = await Promise.all([
        api.get('/sales/orders', { params }),
        api.get('/crm/customers', { params: { limit: 200 } }),
        api.get('/inventory/products', { params: { limit: 200 } }),
        api.get('/tax/slabs'),
        api.get('/tax/templates'),
      ]);
      const d = oRes.data;
      setOrders(Array.isArray(d) ? d : (d.items || []));
      setCustomers(Array.isArray(cRes.data) ? cRes.data : (cRes.data.items || []));
      setProducts(Array.isArray(pRes.data) ? pRes.data : (pRes.data.items || []));
      setSlabs(sRes.data || []);
      setTemplates(tRes.data || []);
    } catch {} finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const custName = (id: number) => { const c = customers.find(c=>c.id===id); return c?(c.company_name||c.name||`CUS-${id}`):`CUS-${id}`; };

  const openCreate = () => {
    setForm({ customer_id:'', order_date:new Date().toISOString().split('T')[0], delivery_date:'', payment_terms:'30 days', notes:'', is_interstate:false });
    setLineItems([emptyLine()]); setShowModal(true);
  };

  const applyTemplate = (t: Template) => {
    setLineItems(t.items.map(item => ({
      id: Math.random().toString(36).slice(2),
      description: item.description, item_type: item.item_type,
      quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
      discount_percent: item.discount_percent, tax_percent: item.tax_percent,
      hsn_code: item.hsn_code||'', product_id: item.product_id,
    })));
    if (t.payment_terms) setForm(f => ({ ...f, payment_terms: t.payment_terms }));
    if (t.notes) setForm(f => ({ ...f, notes: t.notes }));
    setShowTemplateModal(false);
    toast.success(`Template "${t.name}" applied!`);
  };

  const addProduct = (p: Product) => {
    setLineItems(items => [...items, {
      id: Math.random().toString(36).slice(2),
      product_id: p.id, description: p.name, item_type: 'product',
      quantity: 1, unit: p.unit, unit_price: Number(p.selling_price),
      discount_percent: 0, tax_percent: p.tax_percent, hsn_code: p.hsn_code||'',
    }]);
  };

  const updateLine = (id: string, field: string, val: any) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      // Auto-fill from product
      if (field === 'product_id') {
        const prod = products.find(p => p.id === Number(val));
        if (prod) return { ...updated, description: prod.name, unit: prod.unit, unit_price: Number(prod.selling_price), tax_percent: prod.tax_percent, hsn_code: prod.hsn_code||'' };
      }
      // Auto-fill tax from slab
      if (field === 'tax_slab_id') {
        const slab = slabs.find(s => s.id === Number(val));
        if (slab) return { ...updated, tax_percent: slab.rate };
      }
      return updated;
    }));
  };

  const removeLine = (id: string) => setLineItems(items => items.filter(i => i.id !== id));

  const totals = lineItems.reduce((acc, item) => {
    const { subtotal, tax, total } = calcLine(item);
    return { subtotal: acc.subtotal + subtotal, tax: acc.tax + tax, total: acc.total + total };
  }, { subtotal: 0, tax: 0, total: 0 });

  const handleSave = async () => {
    if (!form.customer_id) return toast.error('Select a customer');
    if (lineItems.every(i => !i.description)) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const payload = {
        customer_id: Number(form.customer_id),
        delivery_date: form.delivery_date || undefined,
        payment_terms: form.payment_terms,
        notes: form.notes,
        items: lineItems.filter(i => i.description).map(i => ({
          product_id: i.product_id || undefined,
          description: i.description, quantity: Number(i.quantity), unit: i.unit,
          unit_price: Number(i.unit_price), discount_percent: Number(i.discount_percent),
          tax_percent: Number(i.tax_percent), hsn_code: i.hsn_code,
        })),
      };
      await api.post('/sales/orders', payload);
      toast.success('Sales order created!');
      setShowModal(false); load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const confirmOrder = async (id: number) => {
    await api.put(`/sales/orders/${id}`, { status: 'confirmed' });
    toast.success('Order confirmed'); load();
  };

  const deleteOrder = async (id: number) => {
    if (!window.confirm('Delete this order?')) return;
    await api.delete(`/sales/orders/${id}`); load();
  };

  const totalRevenue = orders.reduce((s,o) => s+(o.total_amount||0), 0);

  const columns = [
    { key:'order_number', title:'Order #', render:(r:SalesOrder) => <span className="font-mono text-indigo-600 font-semibold text-xs">{r.order_number}</span> },
    { key:'customer_id', title:'Customer', render:(r:SalesOrder) => <span className="font-medium">{custName(r.customer_id)}</span> },
    { key:'order_date', title:'Date', render:(r:SalesOrder) => r.order_date?new Date(r.order_date).toLocaleDateString('en-IN'):'-' },
    { key:'status', title:'Status', render:(r:SalesOrder) => <Badge label={r.status} color={statusColor[r.status] as any} /> },
    { key:'total_amount', title:'Total', render:(r:SalesOrder) => <span className="font-semibold">₹{(r.total_amount||0).toLocaleString('en-IN')}</span> },
    { key:'payment_status', title:'Payment', render:(r:SalesOrder) => <Badge label={r.payment_status||'pending'} color={(r.payment_status==='paid')?'green':'yellow'} /> },
  ];

  const filteredProducts = products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Sales Orders</h1>
          <p className="text-slate-500 text-sm">Manage customer sales orders with tax</p></div>
        <div className="flex gap-2">
          <button onClick={() => downloadExcel('/sales/orders/export', 'sales_orders.xlsx')}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300">📥 Export</button>
          <button onClick={openCreate} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Order</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Orders', value:orders.length, color:'text-indigo-600 bg-indigo-50', icon:'🛒' },
          { label:'Confirmed', value:orders.filter(o=>o.status==='confirmed').length, color:'text-green-600 bg-green-50', icon:'✅' },
          { label:'Revenue', value:`₹${(totalRevenue/100000).toFixed(1)}L`, color:'text-purple-600 bg-purple-50', icon:'💰' },
          { label:'Pending', value:orders.filter(o=>o.status==='draft').length, color:'text-yellow-600 bg-yellow-50', icon:'⏳' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${stat.color}`}>{stat.icon}</div>
            <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      <DataTable title="Orders List" columns={columns} data={orders} loading={loading}
        onSearch={(q) => setSearch(q)} onAdd={openCreate} addLabel="+ New Order"
        actions={(row: SalesOrder) => (
          <div className="flex gap-2">
            <button onClick={() => setViewOrder(row)} className="text-xs text-indigo-600 hover:underline">View</button>
            {row.status==='draft' && <button onClick={() => confirmOrder(row.id)} className="text-xs text-green-600 hover:underline">Confirm</button>}
            <button onClick={() => deleteOrder(row.id)} className="text-xs text-red-500 hover:underline">Delete</button>
          </div>
        )}
      />

      {/* ── Create Order Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Sales Order" size="xl">
        <div className="space-y-5">
          {/* Template Bar */}
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
            <span className="text-sm text-indigo-700 font-medium">📋 Use Template:</span>
            <div className="flex gap-2 flex-wrap">
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className="text-xs px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium">
                  {t.name}
                </button>
              ))}
              <button onClick={() => setShowTemplateModal(true)}
                className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium">
                Browse All →
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-600">Customer *</label>
              <select value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id:e.target.value}))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Order Date</label>
              <input type="date" value={form.order_date} onChange={e => setForm(f=>({...f,order_date:e.target.value}))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">Delivery Date</label>
              <input type="date" value={form.delivery_date} onChange={e => setForm(f=>({...f,delivery_date:e.target.value}))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm(f=>({...f,payment_terms:e.target.value}))}
                className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400">
                {['Immediate','7 days','15 days','30 days','45 days','60 days','Milestone-based','Advance'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_interstate} onChange={e=>setForm(f=>({...f,is_interstate:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-600">Inter-state (IGST)</span>
              </label>
            </div>
          </div>

          {/* Product Picker */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-600">QUICK ADD FROM CATALOG</span>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products..."
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto">
              {filteredProducts.slice(0,20).map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-colors">
                  + {p.name} <span className="text-slate-400">₹{Number(p.selling_price).toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Line Items</span>
              <button onClick={() => setLineItems(i=>[...i,emptyLine()])} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">+ Add Row</button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid text-xs font-semibold text-slate-500 uppercase bg-slate-50 px-3 py-2 border-b border-slate-200"
                style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr 80px 32px'}}>
                <span>Description / Product</span><span>Type</span><span>Qty × Unit</span><span>Unit Price</span><span>Disc%</span><span>GST%</span><span>Total</span><span></span>
              </div>
              {lineItems.map(item => {
                const { total } = calcLine(item);
                return (
                  <div key={item.id} className="grid gap-1 px-2 py-2 border-b border-slate-50 items-center"
                    style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr 80px 32px'}}>
                    <input value={item.description} onChange={e=>updateLine(item.id,'description',e.target.value)}
                      placeholder="Description or product name"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    <select value={item.item_type} onChange={e=>updateLine(item.id,'item_type',e.target.value)}
                      className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs focus:outline-none">
                      {['product','service','expense'].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <input type="number" value={item.quantity} onChange={e=>updateLine(item.id,'quantity',e.target.value)} min="0"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none w-14" />
                      <input value={item.unit} onChange={e=>updateLine(item.id,'unit',e.target.value)}
                        className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs focus:outline-none w-12" />
                    </div>
                    <input type="number" value={item.unit_price} onChange={e=>updateLine(item.id,'unit_price',e.target.value)} min="0"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <input type="number" value={item.discount_percent} onChange={e=>updateLine(item.id,'discount_percent',e.target.value)} min="0" max="100"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <select value={item.tax_percent} onChange={e=>updateLine(item.id,'tax_percent',e.target.value)}
                      className="border border-slate-200 rounded-lg px-1 py-1.5 text-xs focus:outline-none">
                      {slabs.map(s=><option key={s.id} value={s.rate}>{s.name}</option>)}
                      {[0,5,12,18,28].map(r=><option key={`r${r}`} value={r}>{r}%</option>)}
                    </select>
                    <span className="text-sm font-semibold text-right pr-1">₹{total.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                    <button onClick={()=>removeLine(item.id)} className="text-red-400 hover:text-red-600 text-xl leading-none">×</button>
                  </div>
                );
              })}
              {/* Totals */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
                <div className="flex justify-end gap-8 text-sm">
                  <div className="text-right space-y-1">
                    <div className="flex justify-between gap-6"><span className="text-slate-500">Subtotal</span><span className="font-medium">₹{totals.subtotal.toLocaleString('en-IN',{maximumFractionDigits:0})}</span></div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">{form.is_interstate ? 'IGST' : 'CGST+SGST'}</span>
                      <span className="font-medium">₹{totals.tax.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                    </div>
                    <div className="flex justify-between gap-6 border-t border-slate-300 pt-1 text-base font-bold">
                      <span>Total</span><span className="text-indigo-600">₹{totals.total.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 gradient-bg text-white rounded-xl py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Creating...' : `Create Order — ₹${totals.total.toLocaleString('en-IN',{maximumFractionDigits:0})}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Template Browser Modal */}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Choose Order Template" size="lg">
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all"
              onClick={() => applyTemplate(t)}>
              <div className="flex items-start justify-between">
                <div><div className="font-semibold text-slate-800">{t.name}</div>
                  <div className="text-xs text-indigo-600 mt-0.5">{t.category}</div></div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{t.items?.length||0} items</span>
              </div>
              {t.description && <p className="text-sm text-slate-500 mt-2">{t.description}</p>}
              <div className="mt-3 flex gap-1 flex-wrap">
                {(t.items||[]).slice(0,4).map((item,i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.description}</span>
                ))}
                {(t.items?.length||0) > 4 && <span className="text-xs text-slate-400">+{(t.items?.length||0)-4} more</span>}
              </div>
              {t.payment_terms && <div className="text-xs text-slate-400 mt-2">Payment: {t.payment_terms}</div>}
            </div>
          ))}
        </div>
      </Modal>

      {/* View Order Modal */}
      {viewOrder && (
        <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder.order_number}`} size="md">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{custName(viewOrder.customer_id)}</span></div>
              <div><span className="text-slate-500">Status:</span> <Badge label={viewOrder.status} color={statusColor[viewOrder.status] as any} /></div>
              <div><span className="text-slate-500">Date:</span> <span>{viewOrder.order_date?new Date(viewOrder.order_date).toLocaleDateString('en-IN'):'-'}</span></div>
              <div><span className="text-slate-500">Payment:</span> <Badge label={viewOrder.payment_status||'pending'} color={viewOrder.payment_status==='paid'?'green':'yellow'} /></div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 text-right">
              <div className="text-sm text-slate-500">Total Amount</div>
              <div className="text-2xl font-bold text-indigo-600">₹{(viewOrder.total_amount||0).toLocaleString('en-IN')}</div>
            </div>
            {viewOrder.notes && <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">{viewOrder.notes}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
