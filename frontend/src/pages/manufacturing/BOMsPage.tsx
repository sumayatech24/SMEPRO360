import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface BOM { id: number; product_id: number; version: string; description: string; status: string; is_active: boolean; created_at: string; }
interface Product { id: number; sku: string; name: string; unit: string; }

export default function BOMsPage() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewBOM, setViewBOM] = useState<any>(null);
  const [form, setForm] = useState({ product_id:'', version:'1.0', description:'', components:[{component_id:'', quantity:1, unit:'pcs', wastage_percent:0}] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/manufacturing/boms', { params:{limit:100} }),
        api.get('/inventory/products', { params:{limit:100} }),
      ]);
      setBoms(bRes.data.items || bRes.data || []);
      setProducts(pRes.data.items || pRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const prodName = (id:number) => { const p = products.find(p=>p.id===id); return p ? `${p.name} (${p.sku})` : `PRD-${id}`; };

  const addComp = () => setForm(f=>({...f, components:[...f.components,{component_id:'',quantity:1,unit:'pcs',wastage_percent:0}]}));
  const removeComp = (i:number) => setForm(f=>({...f, components:f.components.filter((_,x)=>x!==i)}));
  const updateComp = (i:number, k:string, v:any) => setForm(f=>({...f, components:f.components.map((c,x)=>x===i?{...c,[k]:v}:c)}));

  const submit = async () => {
    if (!form.product_id) return toast.error('Select finished product');
    try {
      await api.post('/manufacturing/boms', {
        product_id:Number(form.product_id), version:form.version, description:form.description,
        components: form.components.filter(c=>c.component_id).map(c=>({...c, component_id:Number(c.component_id), quantity:Number(c.quantity), wastage_percent:Number(c.wastage_percent)})),
      });
      toast.success('BOM created!'); setModalOpen(false); load();
      setForm({ product_id:'', version:'1.0', description:'', components:[{component_id:'',quantity:1,unit:'pcs',wastage_percent:0}] });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const columns = [
    { key:'product_id', title:'Finished Product', render:(r:BOM) => <span className="font-medium">{prodName(r.product_id)}</span> },
    { key:'version', title:'Version', render:(r:BOM) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">v{r.version}</span> },
    { key:'description', title:'Description', render:(r:BOM) => <span className="text-slate-500 text-sm">{r.description||'-'}</span> },
    { key:'status', title:'Status', render:(r:BOM) => <Badge label={r.status||'active'} color={(r.status==='active'||!r.status)?'green':'gray'} /> },
    { key:'created_at', title:'Created', render:(r:BOM) => r.created_at?new Date(r.created_at).toLocaleDateString('en-IN'):'-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Bill of Materials</h1><p className="text-slate-500 text-sm mt-1">Define product compositions and raw material requirements</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New BOM</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Total BOMs',value:boms.length},{label:'Products Covered',value:new Set(boms.map(b=>b.product_id)).size},{label:'Active',value:boms.filter(b=>b.is_active!==false).length}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={boms} loading={loading} title="Bill of Materials"
        onAdd={()=>setModalOpen(true)} addLabel="New BOM"
        actions={(row:BOM) => <button onClick={async()=>{const r=await api.get(`/manufacturing/boms/${row.id}`); setViewBOM(r.data);}} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">View</button>}
      />

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Create BOM" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Finished Product *</label>
              <select value={form.product_id} onChange={e=>setForm(f=>({...f,product_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Product</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
              <input value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-slate-700">Components / Raw Materials</label>
              <button onClick={addComp} className="text-xs text-indigo-600 font-medium">+ Add Component</button></div>
            <div className="space-y-2">
              {form.components.map((c,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select className="col-span-5 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" value={c.component_id} onChange={e=>updateComp(i,'component_id',e.target.value)}>
                    <option value="">Select Component</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Qty" value={c.quantity} onChange={e=>updateComp(i,'quantity',e.target.value)} />
                  <input className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Unit" value={c.unit} onChange={e=>updateComp(i,'unit',e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Waste%" value={c.wastage_percent} onChange={e=>updateComp(i,'wastage_percent',e.target.value)} />
                  <button onClick={()=>removeComp(i)} className="col-span-1 text-red-400 hover:text-red-600 text-xl">×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create BOM</button>
          </div>
        </div>
      </Modal>

      {viewBOM && (
        <Modal isOpen={!!viewBOM} onClose={()=>setViewBOM(null)} title={`BOM — ${prodName(viewBOM.product_id)} v${viewBOM.version}`} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{viewBOM.description}</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase"><div className="col-span-2">Component</div><div>Quantity</div><div>Wastage</div></div>
              {(viewBOM.components||[]).map((c:any,i:number)=>(
                <div key={i} className="grid grid-cols-4 px-4 py-3 border-t border-slate-50 text-sm"><div className="col-span-2">{prodName(c.component_id)}</div><div>{c.quantity} {c.unit}</div><div>{c.wastage_percent||0}%</div></div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
