import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';

const ProductsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  const defaultForm = { sku: '', name: '', description: '', category_id: '', product_type: 'finished',
    unit: 'nos', hsn_code: '', cost_price: 0, selling_price: 0, mrp: 0, tax_percent: 18, reorder_level: 0 };
  const [form, setForm] = useState<any>(defaultForm);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/products', { params: { search, limit: 100 } });
      setItems(res?.data?.items || []);
    } catch {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    fetch();
    api.get('/inventory/categories').then(r => setCategories(r.data)).catch(() => {});
  }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/inventory/products/${editItem.id}`, form);
      else await api.post('/inventory/products', form);
      setShowModal(false); setEditItem(null); setForm(defaultForm); fetch();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({ sku: item.sku, name: item.name, description: item.description || '',
      category_id: item.category_id || '', product_type: item.product_type,
      unit: item.unit, hsn_code: item.hsn_code || '', cost_price: item.cost_price,
      selling_price: item.selling_price, mrp: item.mrp, tax_percent: item.tax_percent,
      reorder_level: item.reorder_level });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this product?')) { await api.delete(`/inventory/products/${id}`); fetch(); }
  };

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const columns = [
    { key: 'sku', title: 'SKU', render: (r: any) => <span className="font-mono text-indigo-600 text-xs">{r.sku}</span> },
    { key: 'name', title: 'Product', render: (r: any) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.hsn_code}</div></div> },
    { key: 'product_type', title: 'Type', render: (r: any) => <Badge label={r.product_type} /> },
    { key: 'unit', title: 'Unit' },
    { key: 'cost_price', title: 'Cost Price', render: (r: any) => `₹${r.cost_price?.toLocaleString('en-IN')}` },
    { key: 'selling_price', title: 'Selling Price', render: (r: any) => `₹${r.selling_price?.toLocaleString('en-IN')}` },
    { key: 'tax_percent', title: 'GST %', render: (r: any) => `${r.tax_percent}%` },
    { key: 'reorder_level', title: 'Reorder Qty' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">Products</h1><p className="text-slate-500 text-sm">Product catalog and pricing</p></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Products" value={items.length} icon="🏷️" color="indigo" />
        <StatCard title="Finished Goods" value={items.filter(p=>p.product_type==='finished').length} icon="📦" color="green" />
        <StatCard title="Raw Materials" value={items.filter(p=>p.product_type==='raw').length} icon="🔩" color="orange" />
        <StatCard title="Services" value={items.filter(p=>p.product_type==='service').length} icon="⚡" color="purple" />
      </div>
      <DataTable title="All Products" columns={columns} data={items} loading={loading}
        onAdd={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
        addLabel="Add Product" onExport={() => downloadExcel('/inventory/products/export', 'products.xlsx')}
        onSearch={setSearch} searchPlaceholder="Search products..."
        actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
            <button onClick={() => handleDelete(row.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
          </>
        )}
      />
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">SKU *</label>
            <input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className={inp} disabled={!!editItem} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Product Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Type</label>
            <select value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})} className={inp}>
              <option value="finished">Finished Goods</option><option value="raw">Raw Material</option>
              <option value="semi">Semi-Finished</option><option value="service">Service</option>
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Unit</label>
            <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inp}>
              {['nos','kg','g','lt','ml','mt','ft','box','pcs','set','pair'].map(u => <option key={u} value={u}>{u}</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">HSN Code</label>
            <input value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">GST %</label>
            <select value={form.tax_percent} onChange={e => setForm({...form, tax_percent: +e.target.value})} className={inp}>
              {[0,5,12,18,28].map(t => <option key={t} value={t}>{t}%</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Cost Price (₹)</label>
            <input type="number" value={form.cost_price} onChange={e => setForm({...form, cost_price: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Selling Price (₹)</label>
            <input type="number" value={form.selling_price} onChange={e => setForm({...form, selling_price: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">MRP (₹)</label>
            <input type="number" value={form.mrp} onChange={e => setForm({...form, mrp: +e.target.value})} className={inp} /></div>
          <div><label className="text-xs font-medium text-slate-700 mb-1 block">Reorder Level</label>
            <input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: +e.target.value})} className={inp} /></div>
          <div className="col-span-2"><label className="text-xs font-medium text-slate-700 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} rows={2} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2 gradient-bg text-white rounded-lg text-sm font-medium">{editItem ? 'Update' : 'Add'} Product</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
