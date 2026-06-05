import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Asset {
  id: number; asset_number: string; name: string; asset_type: string;
  category: string; make?: string; model?: string; serial_number?: string;
  purchase_price: number; book_value: number; condition: string;
  status: string; location: string; assigned_to?: number; department_id?: number;
  is_active: boolean; created_at: string;
}

const statusColor: Record<string, string> = {
  active: 'green', under_maintenance: 'yellow', disposed: 'red', transferred: 'blue', in_store: 'gray'
};
const conditionColor: Record<string, string> = {
  new: 'green', good: 'blue', fair: 'yellow', poor: 'red', damaged: 'red'
};

const DEPARTMENTS = ["IT","Engineering","Sales","HR","Finance","Operations","Marketing","Admin","Security","Warehouse"];
const CATEGORIES = ["IT Equipment","Furniture","HVAC","Electrical","Vehicles","Lab Equipment","Safety Equipment","Infrastructure"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    name: '', asset_type: '', category: '', make: '', model: '', serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '', warranty_expiry: '', status: 'active',
    location: '', useful_life_years: '5', salvage_value: '0',
    depreciation_method: 'straight_line',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/assets/', { params: { limit: 100 } });
      setAssets(r.data.items || r.data || []);
    } catch { setAssets([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name || !form.asset_type) return toast.error('Fill required fields');
    try {
      await api.post('/assets/', {
        name: form.name, asset_type: form.asset_type, category: form.category,
        make: form.make || undefined, model: form.model || undefined,
        serial_number: form.serial_number || undefined,
        purchase_date: form.purchase_date,
        purchase_price: Number(form.purchase_price) || 0,
        warranty_expiry: form.warranty_expiry || undefined,
        location: form.location,
        useful_life_years: Number(form.useful_life_years) || 5,
        salvage_value: Number(form.salvage_value) || 0,
        depreciation_method: form.depreciation_method,
      });
      toast.success('Asset added!'); setModalOpen(false); load();
      setForm({ name:'', asset_type:'', category:'', make:'', model:'', serial_number:'', purchase_date:new Date().toISOString().split('T')[0], purchase_price:'', warranty_expiry:'', status:'active', location:'', useful_life_years:'5', salvage_value:'0', depreciation_method:'straight_line' });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const filtered = assets.filter(a => !filter ||
    a.name?.toLowerCase().includes(filter.toLowerCase()) ||
    a.asset_type?.toLowerCase().includes(filter.toLowerCase()) ||
    a.location?.toLowerCase().includes(filter.toLowerCase())
  );

  const totalValue = assets.reduce((s, a) => s + (a.purchase_price || 0), 0);
  const bookValue = assets.reduce((s, a) => s + (a.book_value || 0), 0);

  const columns = [
    { key: 'asset_number', title: 'Asset #', render: (r: Asset) => <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.asset_number}</span> },
    { key: 'name', title: 'Asset Name', render: (r: Asset) => <div><div className="font-medium text-slate-800">{r.name}</div>{r.make && <div className="text-xs text-slate-400">{r.make} {r.model}</div>}</div> },
    { key: 'asset_type', title: 'Type', render: (r: Asset) => r.asset_type },
    { key: 'category', title: 'Category', render: (r: Asset) => r.category || '-' },
    { key: 'location', title: 'Location', render: (r: Asset) => r.location || '-' },
    { key: 'purchase_price', title: 'Purchase Price', render: (r: Asset) => `₹${(r.purchase_price || 0).toLocaleString('en-IN')}` },
    { key: 'book_value', title: 'Book Value', render: (r: Asset) => `₹${(r.book_value || 0).toLocaleString('en-IN')}` },
    { key: 'condition', title: 'Condition', render: (r: Asset) => r.condition ? <Badge label={r.condition} color={conditionColor[r.condition] as any || 'gray'} /> : '-' },
    { key: 'status', title: 'Status', render: (r: Asset) => <Badge label={r.status?.replace('_', ' ')} color={statusColor[r.status] as any || 'gray'} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Asset Register</h1><p className="text-slate-500 text-sm mt-1">Track company assets and equipment</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Asset</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, color: 'text-indigo-600' },
          { label: 'Active', value: assets.filter(a => a.status === 'active').length, color: 'text-green-600' },
          { label: 'Purchase Value', value: `₹${(totalValue/100000).toFixed(1)}L`, color: 'text-slate-800' },
          { label: 'Book Value', value: `₹${(bookValue/100000).toFixed(1)}L`, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Asset Register"
        onSearch={setFilter} searchPlaceholder="Search assets..."
        onAdd={() => setModalOpen(true)} addLabel="Add Asset"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Asset" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dell Latitude Laptop"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type *</label>
              <input value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
                placeholder="Laptop, Server, Chair..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make / Brand</label>
              <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Dell, Apple..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Latitude 5540"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
              <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (₹)</label>
              <input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Expiry</label>
              <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Head Office, Server Room..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Useful Life (Years)</label>
              <input type="number" value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salvage Value (₹)</label>
              <input type="number" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Asset</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
