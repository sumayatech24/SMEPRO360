import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface WO { id: number; wo_number: string; product_id: number; quantity: number; planned_start: string; planned_end: string; status: string; priority: string; }
interface Product { id: number; sku: string; name: string; unit: string; }

const statusColor:Record<string,string> = {draft:'gray',in_progress:'blue',completed:'green',cancelled:'red',on_hold:'yellow'};
const priorityColor:Record<string,string> = {low:'gray',medium:'yellow',high:'red'};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ product_id:'', quantity:'', planned_start:'', planned_end:'', status:'draft', priority:'medium' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        api.get('/manufacturing/workorders', {params:{limit:100}}),
        api.get('/inventory/products', {params:{limit:100}}),
      ]);
      setOrders(wRes.data.items || wRes.data || []);
      setProducts(pRes.data.items || pRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const prodName = (id:number) => products.find(p=>p.id===id)?.name || `PRD-${id}`;
  const prodUnit = (id:number) => products.find(p=>p.id===id)?.unit || 'pcs';

  const submit = async () => {
    if (!form.product_id || !form.quantity) return toast.error('Fill required fields');
    try {
      await api.post('/manufacturing/workorders', { product_id:Number(form.product_id), quantity:Number(form.quantity), planned_start:form.planned_start||undefined, planned_end:form.planned_end||undefined, status:form.status, priority:form.priority });
      toast.success('Work order created!'); setModalOpen(false); load();
      setForm({ product_id:'', quantity:'', planned_start:'', planned_end:'', status:'draft', priority:'medium' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const updateStatus = async (id:number, status:string) => {
    await api.put(`/manufacturing/workorders/${id}`, {status}); toast.success('Status updated'); load();
  };

  const columns = [
    { key:'wo_number', title:'WO #', render:(r:WO) => <span className="font-mono font-medium text-indigo-600">{r.wo_number||`WO-${r.id}`}</span> },
    { key:'product_id', title:'Product', render:(r:WO) => <span className="font-medium">{prodName(r.product_id)}</span> },
    { key:'quantity', title:'Qty', render:(r:WO) => `${r.quantity} ${prodUnit(r.product_id)}` },
    { key:'planned_start', title:'Start', render:(r:WO) => r.planned_start?new Date(r.planned_start).toLocaleDateString('en-IN'):'-' },
    { key:'planned_end', title:'End', render:(r:WO) => r.planned_end?new Date(r.planned_end).toLocaleDateString('en-IN'):'-' },
    { key:'priority', title:'Priority', render:(r:WO) => <Badge label={r.priority} color={priorityColor[r.priority] as any} /> },
    { key:'status', title:'Status', render:(r:WO) => <Badge label={r.status?.replace('_',' ')} color={statusColor[r.status] as any} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Work Orders</h1><p className="text-slate-500 text-sm mt-1">Manage production and manufacturing orders</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Work Order</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['draft','in_progress','completed','cancelled'].map(s=>(
          <div key={s} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 capitalize mb-1">{s.replace('_',' ')}</div>
            <div className="text-2xl font-bold text-slate-800">{orders.filter(o=>o.status===s).length}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={orders} loading={loading} title="Work Orders"
        onAdd={()=>setModalOpen(true)} addLabel="New Work Order"
        actions={(row:WO)=>(
          <div className="flex gap-1">
            {row.status==='draft' && <button onClick={()=>updateStatus(row.id,'in_progress')} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">Start</button>}
            {row.status==='in_progress' && <button onClick={()=>updateStatus(row.id,'completed')} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg">Complete</button>}
            {row.status==='draft' && <button onClick={()=>updateStatus(row.id,'cancelled')} className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">Cancel</button>}
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Create Work Order" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Product *</label>
            <select value={form.product_id} onChange={e=>setForm(f=>({...f,product_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select Product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
              <input type="number" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['low','medium','high'].map(p=><option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['draft','in_progress'].map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned Start</label>
              <input type="date" value={form.planned_start} onChange={e=>setForm(f=>({...f,planned_start:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned End</label>
              <input type="date" value={form.planned_end} onChange={e=>setForm(f=>({...f,planned_end:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Work Order</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
